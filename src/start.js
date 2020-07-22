import { buildLogger } from '@bct/b-logger';
import { start } from './index';

const logger = buildLogger('start');

async function main() {
  await start();
  logger.info('user data service started');
}

main();
