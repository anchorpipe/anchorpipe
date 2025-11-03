import * as amqp from 'amqplib';
import type { Channel, Options } from 'amqplib';

export type MqConnection = { connection: any; channel: Channel };

export async function connectRabbit(url: string, socketOptions?: any): Promise<MqConnection> {
  const connection: any = await amqp.connect(url, socketOptions as Options.Connect);
  const channel: Channel = await connection.createChannel();
  return { connection, channel };
}

export async function assertQueue(channel: Channel, queue: string, options?: Options.AssertQueue) {
  await channel.assertQueue(queue, { durable: true, ...(options || {}) });
}

export async function publishJson(channel: Channel, queue: string, message: unknown) {
  const payload = Buffer.from(JSON.stringify(message));
  channel.sendToQueue(queue, payload, { contentType: 'application/json', persistent: true });
}

export async function consumeJson(
  channel: Channel,
  queue: string,
  handler: (msg: any) => Promise<void> | void
) {
  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const content = JSON.parse(msg.content.toString());
      await handler(content);
      channel.ack(msg);
    } catch (err) {
      channel.nack(msg, false, false);
    }
  });
}


