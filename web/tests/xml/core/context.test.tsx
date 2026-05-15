import { createContext, setupContext } from '@xml/core/context';
import type { ASTNode } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('core/context', () => {
    it('creates a blank runtime context', () => {
        expect(createContext()).toEqual({
            invalidate: expect.any(Function),
            setups: {},
            values: {},
        });
    });

    it('returns the same context for an empty ast', async () => {
        const ctx = createContext();
        const ast: ASTNode[] = [];

        await expect(setupContext(ast, ctx, '/api')).resolves.toBe(ctx);
    });
});
