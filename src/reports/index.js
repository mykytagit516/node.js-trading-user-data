import config from 'config';
import { buildLogger } from '@bct/b-logger';
import Bot from './telegram';
import sendEmail from './email';

const notifyBot = new Bot(config.telegram.notifyBot.token, config.telegram.chatId);
const logger = buildLogger('report');

const getReporter = to => {
  switch (to) {
    case 'telegram':
      return notifyBot.send.bind(notifyBot);
    case 'log':
      return logger.info.bind(logger);
    default:
      // eslint-disable-next-line no-console
      return console.log;
  }
};

export default {
  telegram: getReporter('telegram'),
  email: sendEmail,
};
