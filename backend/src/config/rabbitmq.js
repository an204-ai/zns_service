const amqplib = require('amqplib');
const { env } = require('./env');

let connection = null;
let channel = null;

const QUEUES = {
  ZNS_SEND: 'zns_send_queue',
  ZNS_DLQ: 'zns_dead_letter_queue',
  ZNS_CALLBACK: 'zns_callback_queue',
};

const EXCHANGES = {
  ZNS: 'zns_exchange',
  ZNS_DLX: 'zns_dlx_exchange',
};

async function connectRabbitMQ() {
  try {
    connection = await amqplib.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Setup dead letter exchange
    await channel.assertExchange(EXCHANGES.ZNS_DLX, 'direct', { durable: true });
    await channel.assertQueue(QUEUES.ZNS_DLQ, { durable: true });
    await channel.bindQueue(QUEUES.ZNS_DLQ, EXCHANGES.ZNS_DLX, 'zns_dead');

    // Setup main exchange and queue
    await channel.assertExchange(EXCHANGES.ZNS, 'direct', { durable: true });
    await channel.assertQueue(QUEUES.ZNS_SEND, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.ZNS_DLX,
        'x-dead-letter-routing-key': 'zns_dead',
      },
    });
    await channel.bindQueue(QUEUES.ZNS_SEND, EXCHANGES.ZNS, 'zns_send');

    // Callback queue
    await channel.assertQueue(QUEUES.ZNS_CALLBACK, { durable: true });

    // Prefetch 1 message at a time for rate limiting
    await channel.prefetch(1);

    console.log('✅ RabbitMQ connected & queues configured');
    return { connection, channel };
  } catch (error) {
    console.error('❌ RabbitMQ connection error:', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

function getChannel() {
  return channel;
}

function getConnection() {
  return connection;
}

module.exports = { connectRabbitMQ, getChannel, getConnection, QUEUES, EXCHANGES };
