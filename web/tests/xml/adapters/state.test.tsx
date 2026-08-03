import { describe, expect, it } from 'vitest';
import { setupContext } from '@/xml/core/context';
import type { ExecutionContext } from '@/xml/types';

describe('State', () => {
    /* Multiple state attributes should seed a proxied object slot. */
    it('seeds multi-field state values', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        await setupContext(
            [{ name: 'State', params: { id: 'state1', value1: 'first value', score: '10', list: '[]' } }],
            ctx,
            ''
        );

        expect(ctx.values.state1).toEqual({ value1: 'first value', score: 10, list: [] });
    });
});
