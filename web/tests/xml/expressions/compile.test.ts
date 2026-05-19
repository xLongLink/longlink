import { compile } from '@xml/expressions';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('compile', () => {
    it('returns a resolver function', () => {
        const resolver = compile('${count + 1}');
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {}, count: 1 };

        expect(resolver(ctx)).toBe(2);
    });
});
