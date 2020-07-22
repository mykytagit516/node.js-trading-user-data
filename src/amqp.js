import config from 'config';
import amqp from 'amqplib';
import { buildLogger } from '@bct/b-logger';
import Cache from './cache';

const logger = buildLogger('amqp');

const { amqp: amqpConf } = config;

let connection;

const channelCache = new Cache();

const getConnection = () => {
  if (connection) {
    return Promise.resolve(connection);
  }

  return amqp.connect(amqpConf)
    .then(conn => {
      connection = conn;

      connection.on('error', err => logger.error(err, 'Connection error'));

      connection.on('close', () => {
        connection = null;
        channelCache.clear();
        logger.error('Amqp connection closed, exiting');
        process.exit(-1);
      });

      return connection;
    });
};

const getChannel = async (key, conn, opts = {}) => {
  const { exch, durable } = opts;

  const channel = channelCache.get(key);

  if (channel) {
    return channel;
  }

  const ch = await conn.createChannel();
  await ch.assertExchange(key, exch || 'fanout', { durable: durable || false });
  channelCache.add(key, ch);
  return ch;
};

export const publish = async (exchange, msg, opts = {}) => {
  const { route, exch } = opts;

  try {
    const conn = await getConnection();
    const channel = await getChannel(exchange, conn, { exch: exch || 'fanout' });
    await channel.publish(exchange, route || '', Buffer.from(msg));
  } catch (err) {
    logger.error(err);
  }
};

export const consume = async (exchange, handler, opts = {}) => {
  const {
    queue, exch, route, settings,
  } = opts;

  const queueSettings = { ...amqpConf.queues.settings, ...(settings || {}) };
  try {
    const conn = await getConnection();
    const channel = await getChannel(exchange, conn, { exch: exch || 'fanout' });
    const qok = await channel.assertQueue(queue || '', queueSettings);
    await channel.bindQueue(qok.queue, exchange, route || '');
    await channel.consume(qok.queue, async msg => {
      try {
        await handler(msg);
      } catch (err) {
        logger.error(err, msg.content);
      }
      await channel.ack(msg);
    });
  } catch (err) {
    logger.error(err);
  }
};


export const close = async () => {
  const channelsPromises = channelCache
    .keys()
    .map(ch => channelCache.get(ch).close());

  await Promise.all(channelsPromises);
  await connection.close();
};
