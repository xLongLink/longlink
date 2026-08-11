import { describe, expect, it } from 'vitest';
import { compileAttribute, evaluate } from '@/xml/v1/expressions';
import type { ExecutionContext } from '@/xml/v1/types';

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

        expect(evaluate(compileAttribute('${count + total}'), ctx)).toBe(11);
        expect(evaluate(compileAttribute('${name}'), ctx)).toBe('from-context');
    });

    /* Plain and mixed text should render interpolated values. */
    it('interpolates text containing expressions', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            index: 0,
            name: 'Hero',
        };

        expect(evaluate(compileAttribute('${index + 1}. ${name}'), ctx)).toBe('1. Hero');
    });

    /* Object literals inside `${...}` should be evaluated as objects, not strings. */
    it('parses object literals wrapped in `${...}`', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            value: 5,
        };

        expect(evaluate(compileAttribute('${{ next: value + 1 }}'), ctx)).toEqual({ next: 6 });
    });

    /* Brace characters inside strings should not break wrapped-expression detection. */
    it('evaluates wrapped expressions containing brace characters in strings', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };

        expect(evaluate(compileAttribute('${"{"}'), ctx)).toBe('{');
    });

    /* `${...}` expressions should resolve directly to nested values. */
    it('resolves nested value expression', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            form: { value: 'draft', placeholder: 'Name' },
        };

        expect(evaluate(compileAttribute('${form.value}'), ctx)).toBe('draft');
    });

    it('does not read inherited member values', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            user: { name: 'Ada' },
        };

        expect(evaluate(compileAttribute('${user.toString}'), ctx)).toBeUndefined();
        expect(evaluate(compileAttribute('${"toString" in user}'), ctx)).toBe(false);
        expect(evaluate(compileAttribute('${"name" in user}'), ctx)).toBe(true);
    });

    it('ignores unsafe object literal keys', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
        };
        const result = evaluate(compileAttribute('${{ __proto__: { polluted: true }, constructor: true, safe: 1 }}'), ctx) as Record<
            string,
            unknown
        >;

        expect(result.safe).toBe(1);
        expect(result.constructor).toBeUndefined();
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
});
