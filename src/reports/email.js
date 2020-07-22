import fs from 'fs';
import config from 'config';
import ejs from 'ejs';
import Mailgun from 'mailgun-js';
import { buildLogger } from '@bct/b-logger';


const logger = buildLogger('emailing');

const { apiKey, domain } = config.mailgun;

const mailgun = apiKey && domain ? Mailgun({ apiKey, domain }) : null;

function recipient(a) {
  return a.name
    ? `"${a.name}" <${a.email}>`
    : a.email;
}

function recipients(list) {
  return (list || [])
    .map(recipient)
    .join(', ');
}

const renderEJSFile = (template, params) => {
  return new Promise((resolve, reject) => {
    ejs.renderFile(template, params, (err, str) => {
      if (err) {
        reject(err);
      } else {
        resolve(str);
      }
    });
  });
};

/**
 * @param templateFile
 * @param params
 * @returns {Promise.<*>}
 */
const renderEmailTemplate = (templateFile, params) => {
  params.mainAppHost = config.emails.mainAppHost;
  params.imgPrefix = config.emails.imgPrefix;

  const htmlFile = `${config.emails.templatesDir}/${templateFile}.ejs`;

  return renderEJSFile(htmlFile, params);
};

/**
 *
 * @param templateName
 * @param params
 * @returns {Promise<void>}
 */
function sendEmail(templateName, params) {
  const options = Object.assign(config.emails[templateName], params);
  const { template } = options;
  logger.info({ template, options }, 'Going to send email message');

  let subject = '';
  let html;

  return Promise.resolve()
    .then(() => {
      if (options.subject) {
        ({ subject } = options);
        return null;
      }
      return renderEmailTemplate(`${template}/subject`, options)
        .then(result => subject = result.trim())
        .catch(err => {
          logger.error(err, 'Cannot render subject', { options });
        });
    })
    .then(() => {
      return renderEmailTemplate(`${template}/body`, options)
        .then(result => html = result.trim())
        .catch(err => {
          logger.error(err, 'Error rendering HTML file', { options });
          throw err;
        });
    })
    .then(() => {
      const {
        from, to, cc, bcc, reply_to: replyTo,
      } = options;
      const data = {
        from: recipient(from),
        subject,
        html,
      };
      let ok = 0;
      if (to) {
        data.to = Array.isArray(to) ? recipients(to) : recipients([to]);
        ok = 1;
      }
      if (cc && Array.isArray(cc) && cc.length) {
        data.cc = recipients(cc);
        ok = 1;
      }
      if (bcc && Array.isArray(bcc) && bcc.length) {
        data.bcc = recipients(bcc);
        ok = 1;
      }
      data['h:Reply-To'] = replyTo || from.email;

      if (!ok) {
        throw new Error('Recipients not found');
      }

      return data;
    })

    .then(message => {
      if (!mailgun) {
        return fs.writeFileSync(`${+new Date()}-${template}.html`, message.html);
      }
      return mailgun.messages().send(message)
        .then(result => {
          logger.info({ result }, 'Mailgun result');
        })
        .catch(err => {
          logger.error(err, 'Mailgun error');
          throw err;
        });
    });
}

export default sendEmail;
