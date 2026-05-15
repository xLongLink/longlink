import { query } from '@xml/core/query';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('query', () => {
    it('stores fetched JSON on the runtime context', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const originalFetch = globalThis.fetch;

        globalThis.fetch = (async () =>
            new Response(JSON.stringify({ items: [1, 2, 3] }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })) as unknown as typeof fetch;

        try {
            await query(ctx, 'items', '/items', '/api');
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(ctx.values.items).toEqual({ items: [1, 2, 3] });
    });
});
