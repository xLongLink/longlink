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

        expect(evaluate(compileAttribute('${{ next: value + 1 }}'), ctx)).toEqual({ next: 6 });
    });

    it('evaluates wrapped expressions containing brace characters in strings', () => {
        const ctx: Scope = { bindings: {} };

        expect(evaluate(compileAttribute('${"{"}'), ctx)).toBe('{');
    });

    it('resolves nested value expression', () => {
        const ctx: Scope = { bindings: { form: { value: 'draft', placeholder: 'Name' } } };

        expect(evaluate(compileAttribute('${form.value}'), ctx)).toBe('draft');
    });

    it('does not read inherited member values', () => {
        const ctx: Scope = { bindings: { user: { name: 'Ada' } } };

        expect(evaluate(compileAttribute('${user.toString}'), ctx)).toBeUndefined();
    });

    it.each(['${"name" in user}', '${1 == "1"}', '${1 != "2"}'])('rejects unsupported operators: %s', (value) => {
        const ctx: Scope = { bindings: {} };

        expect(() => evaluate(compileAttribute(value), ctx)).toThrow('Operator not allowed');
    });

    it.each(['${[value]}', '${value ? 1 : 0}'])('rejects unsupported expression nodes: %s', (value) => {
        const ctx: Scope = { bindings: { value: 1 } };

        expect(() => evaluate(compileAttribute(value), ctx)).toThrow('Unsupported node');
    });

    it('rejects object spread expressions', () => {
        const ctx: Scope = { bindings: { value: 1 } };

        expect(() => evaluate(compileAttribute('${{ ...value }}'), ctx)).toThrow('Object spread not allowed');
    });

    it('rejects unknown optional calls', () => {
        const ctx: Scope = { bindings: {} };

        expect(() => evaluate(compileAttribute('${unknown?.()}'), ctx)).toThrow('Function call not allowed');
    });

    it.each(['${Array.isArray(value)}', '${Math.floor(value)}'])('rejects removed static helpers: %s', (value) => {
        const ctx: Scope = { bindings: { value: 1 } };

        expect(() => evaluate(compileAttribute(value), ctx)).toThrow('Function call not allowed');
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
        // Arrange
        const ctx: Scope = { bindings: {} };

        // Act
        const result = evaluate(compileAttribute(value), ctx);

        // Assert
        expect(result).toBe(expected);
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
