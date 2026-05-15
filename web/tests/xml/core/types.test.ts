import type { ASTNode, ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('xml types', () => {
    it('supports AST node and runtime context shapes', () => {
        const node: ASTNode = { name: 'Page', children: { name: 'Text', params: { value: 'Hello' } } };
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        expect(node.name).toBe('Page');
        expect(ctx.values).toEqual({});
    });
});
