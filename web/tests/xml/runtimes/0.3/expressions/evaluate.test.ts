import { describe, expect, it } from 'vitest';
import { compileAttribute, evaluate } from '@/xml/runtimes/0.3/expressions';
import type { Scope } from '@/xml/runtimes/0.3/types';

describe('evaluate', () => {
    /* Evaluation should resolve expressions against the flat runtime context. */
    it('resolves expressions against flat context values', () => {
        const ctx: Scope = { bindings: { count: 1, total: 10 } };

        expect(evaluate(compileAttribute('${count + total}'), ctx)).toBe(11);
    });

    /* Plain and mixed text should render interpolated values. */
    it('interpolates text containing expressions', () => {
        const ctx: Scope = { bindings: { index: 0, name: 'Hero' } };

        expect(evaluate(compileAttribute('${index + 1}. ${name}'), ctx)).toBe('1. Hero');
    });

    it('preserves literal expression syntax without parsing it', () => {
        const ctx: Scope = { bindings: {} };

        expect(evaluate(compileAttribute('${not valid', true), ctx)).toBe('${not valid');
    });

    /* Object literals inside `${...}` should be evaluated as objects, not strings. */
    it('parses object literals wrapped in `${...}`', () => {
        const ctx: Scope = { bindings: { value: 5 } };

        expect(evaluate(compileAttribute('${{ next: value + 1 }}'), ctx)).toEqual({ next: 6 });
    });

    /* Brace characters inside strings should not break wrapped-expression detection. */
    it('evaluates wrapped expressions containing brace characters in strings', () => {
        const ctx: Scope = { bindings: {} };

        expect(evaluate(compileAttribute('${"{"}'), ctx)).toBe('{');
    });

    /* `${...}` expressions should resolve directly to nested values. */
    it('resolves nested value expression', () => {
        const ctx: Scope = { bindings: { form: { value: 'draft', placeholder: 'Name' } } };

        expect(evaluate(compileAttribute('${form.value}'), ctx)).toBe('draft');
    });

    it('does not read inherited member values', () => {
        const ctx: Scope = { bindings: { user: { name: 'Ada' } } };

        expect(evaluate(compileAttribute('${user.toString}'), ctx)).toBeUndefined();
    });

    it.each(['${"name" in user}', '${1 == "1"}', '${1 != "2"}'])('rejects unsupported operators: %s', (value) => {
        const ctx: Scope = { bindings: { user: { name: 'Ada' } } };

        expect(() => evaluate(compileAttribute(value), ctx)).toThrow('Operator not allowed');
    });

    it('ignores unsafe object literal keys', () => {
        const ctx: Scope = { bindings: {} };
        const result = evaluate(
            compileAttribute('${{ __proto__: { polluted: true }, constructor: true, safe: 1 }}'),
            ctx
        ) as Record<string, unknown>;

        expect(result.safe).toBe(1);
        expect(result.constructor).toBeUndefined();
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
});
