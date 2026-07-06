import { evaluate } from '@/xml/expressions';
import type { ExecutionContext } from '@/xml/types';
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

        expect(evaluate('${count + total}', ctx)).toBe(11);
        expect(evaluate('${name}', ctx)).toBe('from-context');
    });

    /* Plain text with interpolation should render interpolated values. */
    it('interpolates text containing expressions', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            count: 4,
        };

        expect(evaluate('Count: ${count}', ctx)).toBe('Count: 4');
    });

    it('interpolates mixed text with `${...}` expressions', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            index: 0,
            name: 'Hero',
        };

        expect(evaluate('${index + 1}. ${name}', ctx)).toBe('1. Hero');
    });

    /* A single `${...}` expression should return its typed runtime value. */
    it('returns typed value for single expression', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            count: 4,
        };

        expect(evaluate('${count * 2}', ctx)).toBe(8);
    });

    /* Object literals inside `${...}` should be evaluated as objects, not strings. */
    it('parses object literals wrapped in `${...}`', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            value: 5,
        };

        expect(evaluate('${{ next: value + 1 }}', ctx)).toEqual({ next: 6 });
    });

    /* Brace characters inside strings should not break wrapped-expression detection. */
    it('evaluates wrapped expressions containing brace characters in strings', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };

        expect(evaluate('${"{"}', ctx)).toBe('{');
    });

    /* `${...}` expressions should resolve directly to nested values. */
    it('resolves nested value expression', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            form: { value: 'draft', placeholder: 'Name' },
        };

        expect(evaluate('${form.value}', ctx)).toBe('draft');
    });

    it('does not read inherited member values', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            user: { name: 'Ada' },
        };

        expect(evaluate('${user.toString}', ctx)).toBeUndefined();
        expect(evaluate('${"toString" in user}', ctx)).toBe(false);
        expect(evaluate('${"name" in user}', ctx)).toBe(true);
    });

    it('ignores unsafe object literal keys', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };
        const result = evaluate('${{ __proto__: { polluted: true }, constructor: true, safe: 1 }}', ctx) as Record<
            string,
            unknown
        >;

        expect(result.safe).toBe(1);
        expect(result.constructor).toBeUndefined();
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
});
