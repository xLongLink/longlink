import type { ASTNode, ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('xml types', () => {
    it('supports AST node and runtime context shapes', () => {
        const node: ASTNode = { name: 'longlink', children: [{ name: 'P', params: { i18n: 'copy.body' } }] };
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        expect(node.name).toBe('longlink');
        expect(ctx.values).toEqual({});
    });
});
