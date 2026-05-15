import { evaluate } from '@xml/core/expressions';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('evaluate', () => {
    /* Evaluation should resolve expressions against the flat runtime context. */
    it('resolves expressions against flat context values', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            count: 1,
            total: 10,
            name: 'from-context',
        };

        expect(evaluate('{count + total}', ctx)).toBe(11);
        expect(evaluate('{name}', ctx)).toBe('from-context');
    });

    /* Plain text with interpolation should render interpolated values. */
    it('interpolates text containing expressions', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            count: 4,
        };

        expect(evaluate('Count: {count}', ctx)).toBe('Count: 4');
    });

    /* A single braced expression should return its typed runtime value. */
    it('returns typed value for single expression', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            count: 4,
        };

        expect(evaluate('{count * 2}', ctx)).toBe(8);
    });

    /* Object literals inside braces should be evaluated as objects, not strings. */
    it('parses object literals wrapped in braces', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            value: 5,
        };

        expect(evaluate('{next: value + 1}', ctx)).toEqual({ next: 6 });
    });

    /* Braced expressions should resolve directly to nested values. */
    it('resolves nested value expression', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            form: { value: 'draft', placeholder: 'Name' },
        };

        expect(evaluate('{form.value}', ctx)).toBe('draft');
    });
});
