import { describe, expect, it } from 'vitest';
import { query } from '@/xml/core/query';
import type { ExecutionContext } from '@/xml/types';
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
});
