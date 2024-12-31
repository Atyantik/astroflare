import type { ExportedHandler } from '@cloudflare/workers-types';
import { getDBClient, listStorageRecords } from '@services/database';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const DB = await getDBClient(this, env.DB);
		let storageRecords: Record<string, unknown>[] = [];
		try {
			storageRecords = await listStorageRecords(DB);
		} catch {
			// Do nothing
		}

		const data = {
			ctx,
			storageRecords,
			headers: Object.fromEntries(request.headers.entries()),
			env: Object.keys(env),
			method: request.method,
			url: request.url,
		};
		return new Response(JSON.stringify(data, null, 2), {
			headers: { 'content-type': 'application/json' },
		});
	},

	// async queue( batch: MessageBatch, env: Environment, ctx: ExecutionContext)
	async queue(batch): Promise<void> {
		let messages = JSON.stringify(batch.messages);
		console.log(`Consumed from our queue: ${messages}`);
		batch.ackAll();
	},
	// scheduled(event: ScheduledEvent, env: Environment, ctx: ExecutionContext)
	async scheduled(event, env, ctx) {
		// Pass a promise
		ctx.waitUntil(
			(async () => {
				console.log(`Scehduler triggered at UTC: ${new Date().toUTCString()}`);
			})(),
		);
	},
	// eslint-disable-next-line no-undef
} satisfies ExportedHandler<Env>;
