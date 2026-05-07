import { evaluate } from '@xml';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('evaluate', () => {
    /* Evaluation should resolve expressions against the flat runtime context. */
    it('resolves expressions against flat context values', () => {
        const ctx: ExecutionContext = {
            count: 1,
            total: 10,
            name: 'from-context',
        };

        expect(evaluate('{count + total}', ctx)).toBe(11);
        expect(evaluate('{name}', ctx)).toBe('from-context');
    });
});

describe('evaluate literals', () => {
    /* Plain text with interpolation should render interpolated values. */
    it('interpolates text containing expressions', () => {
        const ctx: ExecutionContext = {
            count: 4,
        };

        expect(evaluate('Count: {count}', ctx)).toBe('Count: 4');
    });

    /* A single braced expression should return its typed runtime value. */
    it('returns typed value for single expression', () => {
        const ctx: ExecutionContext = {
            count: 4,
        };

        expect(evaluate('{count * 2}', ctx)).toBe(8);
    });

    /* Object literals inside braces should be evaluated as objects, not strings. */
    it('parses object literals wrapped in braces', () => {
        const ctx: ExecutionContext = {
            value: 5,
        };

        expect(evaluate('{next: value + 1}', ctx)).toEqual({ next: 6 });
    });
});

describe('evaluate bindings', () => {
    /* Braced expressions should resolve directly to nested values. */
    it('resolves nested value expression', () => {
        const ctx: ExecutionContext = {
            form: { value: 'draft', placeholder: 'Name' },
        };

        expect(evaluate('{form.value}', ctx)).toBe('draft');
    });
});
