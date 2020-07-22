import config from 'config';
import { buildLogger } from '@bct/b-logger';
import { connect } from '@bct/trading-zoo-node-models';
import { start as startHost } from 'bct-app';

import { close as closeConnection } from './amqp';
import { init as initConsumers } from './consumers';

const logger = buildLogger('controller');
let connection;

async function checkConnection() {
  try {
    const options = Object.assign({}, { logger, ...config.db });
    connection = connect(options);
    await connection.authenticate();
    logger.info('Connection has been to the database established successfully.');
  } catch (err) {
    logger.error('Unable to connect to the database:', err);
  }
}

function prepareShutdown(...processes) {
  const terminate = async () => {
    logger.info('Terminating...');
    await closeConnection();
    await connection.disconnect();
    for (const p of processes) {
      if (p && p.unsubscribe) {
        p.unsubscribe();
      }
    }
  };
  process.on('SIGINT', terminate);
  process.on('SIGTERM', terminate);
}

async function main() {
  const utils = await startHost();

  prepareShutdown(utils);

  await checkConnection();
  await initConsumers();

  logger.info('Server started');
}

export const start = main;
