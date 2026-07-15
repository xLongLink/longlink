import { describe, expect, it } from 'bun:test';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { setupContext } from '@/xml/core/context';

describe('State', () => {
    /* Multiple state attributes should seed a proxied object slot. */
    it('seeds multi-field state values', async () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const ast: ASTNode[] = [
            {
                name: 'State',
                params: { id: 'state1', value1: 'first value', score: '10', list: '[]' },
            },
        ];

        await setupContext(ast, ctx, '');

        expect(ctx.values.state1).toEqual({ value1: 'first value', score: 10, list: [] });
    });
});
