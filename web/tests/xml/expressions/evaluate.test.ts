import type { Scope } from '@/xml/types';
import { describe, expect, it } from 'vitest';
import { evaluate } from '@/xml/expressions/evaluate';
import { compileAttribute } from '@/xml/expressions/compile';

describe('evaluate', () => {
    it('resolves expressions against flat context values', () => {
        const ctx: Scope = { bindings: { count: 1, total: 10 } };

        expect(evaluate(compileAttribute('${count + total}'), ctx)).toBe(11);
    });

    it('interpolates text containing expressions', () => {
        const ctx: Scope = { bindings: { index: 0, name: 'Hero' } };

        expect(evaluate(compileAttribute('${index + 1}. ${name}'), ctx)).toBe('1. Hero');
    });

    it('parses object literals wrapped in `${...}`', () => {
        const ctx: Scope = { bindings: { value: 5 } };

        expect(evaluate(compileAttribute('${{ next: value + 1 }}'), ctx)).toEqual({
            next: 6,
        });
    });

    it('evaluates wrapped expressions containing brace characters in strings', () => {
        const ctx: Scope = { bindings: {} };

        expect(evaluate(compileAttribute('${"{"}'), ctx)).toBe('{');
    });

    it('resolves nested value expression', () => {
        const ctx: Scope = {
            bindings: { form: { value: 'draft', placeholder: 'Name' } },
        };

        expect(evaluate(compileAttribute('${form.value}'), ctx)).toBe('draft');
    });

    it('does not read inherited member values', () => {
        const ctx: Scope = { bindings: { user: { name: 'Ada' } } };

        expect(evaluate(compileAttribute('${user.toString}'), ctx)).toBeUndefined();
    });

    it('reads own computed members without exposing inherited values', () => {
        const ctx: Scope = { bindings: { user: { name: 'Ada' } } };

        expect(evaluate(compileAttribute('${user["name"]}'), ctx)).toBe('Ada');
        expect(evaluate(compileAttribute('${user["constructor"]}'), ctx)).toBeUndefined();
    });

    it.each(['${"name" in user}', '${1 == "1"}', '${1 != "2"}'])('rejects unsupported operators: %s', (value) => {
        expect(() => evaluate(compileAttribute(value), { bindings: {} })).toThrow('Operator not allowed');
    });

    it('evaluates only the selected conditional branch', () => {
        const ctx: Scope = { bindings: { administrator: true } };

        expect(evaluate(compileAttribute("${administrator ? 'Administrator' : unknown()}"), ctx)).toBe('Administrator');
    });

    it.each([
        { expression: '${"name" in user}', error: 'Operator not allowed' },
        { expression: '${1 == "1"}', error: 'Operator not allowed' },
        { expression: '${1 != "2"}', error: 'Operator not allowed' },
        { expression: '${[value]}', error: 'Unsupported node' },
        { expression: '${{ ...value }}', error: 'Object spread not allowed' },
        { expression: '${unknown?.()}', error: 'Function call not allowed' },
        { expression: '${Array.isArray(value)}', error: 'Function call not allowed' },
        { expression: '${Math.floor(value)}', error: 'Function call not allowed' },
    ])('rejects unsupported expression $expression', ({ expression, error }) => {
        const ctx: Scope = { bindings: { value: 1 } };

        expect(() => evaluate(compileAttribute(expression), ctx)).toThrow(error);
    });

    it('allows optional calls to whitelisted helpers', () => {
        const ctx: Scope = { bindings: {} };

        expect(evaluate(compileAttribute('${Boolean?.(1)}'), ctx)).toBe(true);
    });

    it.each([
        ['${false && unknown()}', false],
        ['${true || unknown()}', true],
        ['${"value" ?? unknown()}', 'value'],
    ])('short-circuits unsafe right operands: %s', (value, expected) => {
        expect(evaluate(compileAttribute(value), { bindings: {} })).toBe(expected);
    });

    it('ignores unsafe object literal keys', () => {
        const ctx: Scope = { bindings: {} };
        const result = evaluate(
            compileAttribute('${{ __proto__: { polluted: true }, constructor: true, safe: 1 }}'),
            ctx
        ) as Record<string, unknown>;

        expect(result.safe).toBe(1);
        expect(result.constructor).toBeUndefined();
        expect(Object.getPrototypeOf(result)).toBeNull();
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
});
