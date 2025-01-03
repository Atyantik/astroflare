import { initDBInstance } from '@flarekit/database';
import { Handler, Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

const honoHomeRoute: Handler = (c) => {
  return c.json({
    message: 'Welcome to Hono!',
  });
};
app.get('/', honoHomeRoute);

export default {
  fetch: app.fetch,
  /* istanbul ignore next: Cannot test Queue invocation */
  // async queue( batch: MessageBatch, env: Environment, ctx: ExecutionContext)
  async queue(batch): Promise<void> {
    let messages = JSON.stringify(batch.messages);
    console.log(`Consumed from our queue: ${messages}`);
    batch.ackAll();
  },

  /* istanbul ignore next: Cannot test scheduled invocation */
  // scheduled(event: ScheduledEvent, env: Environment, ctx: ExecutionContext)
  async scheduled(event, env, ctx) {
    const db = initDBInstance(ctx, env);
    // Pass a promise
    ctx.waitUntil(
      (async () => {
        // Clear the storage every 2th minute
        if (event.cron.startsWith('*/2')) {
          const storageRecords = await db.storage.listStorageRecords();
          // Remove each storage record from
          for (const record of storageRecords) {
            await env.STORAGE.delete(record.key);
          }
          await db.storage.clearStorageRecords();
        }
      })(),
    );
  },
} satisfies ExportedHandler<Env>;