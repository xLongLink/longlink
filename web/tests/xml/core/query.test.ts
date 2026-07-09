import { query } from '@/xml/core/query';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { withGlobalValue } from '../../helpers/globals';

describe('query', () => {
    it('stores fetched JSON on the runtime context', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        await withGlobalValue(
            'fetch',
            async () =>
                new Response(JSON.stringify({ items: [1, 2, 3] }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                }),
            async () => {
                await query(ctx, 'items', '/items', '/api');
            }
        );

        expect(ctx.values.items).toEqual({ items: [1, 2, 3] });
    });

    it('rejects external query URLs before fetching', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        let fetchCalls = 0;

        await withGlobalValue(
            'fetch',
            async () => {
                fetchCalls += 1;

                return new Response('{}');
            },
            async () => {
                await expect(query(ctx, 'items', 'https://example.com/items', '/api')).rejects.toThrow(
                    'XML request URL must be app-relative'
                );
            }
        );

        expect(fetchCalls).toBe(0);
    });
});
