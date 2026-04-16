import { describe, it, expect } from 'bun:test';
import { resolveValue } from '../src/runtime';
import type { ExecutionContext } from '../src/types';

function ctx(scope: Record<string, any> = {}): ExecutionContext {
    return { state: {}, queries: {}, scope };
}

describe('resolveValue', () => {
    // --- Plain string (interpolation path) ---

    it('returns a plain string unchanged when it has no placeholders', () => {
        expect(resolveValue('hello', ctx())).toBe('hello');
    });

    it('interpolates {expr} placeholders inside a plain string', () => {
        expect(resolveValue('Hello {name}', ctx({ name: 'Bob' }))).toBe('Hello Bob');
    });

    // --- {expression} block (evaluate path) ---

    it('evaluates a {number} block and returns the number (not a string)', () => {
        // Distinguish from interpolation: the raw value, not a string coercion
        expect(resolveValue('{42}', ctx())).toBe(42);
    });

    it('evaluates a {boolean} block and returns the boolean', () => {
        expect(resolveValue('{true}', ctx())).toBe(true);
        expect(resolveValue('{false}', ctx())).toBe(false);
    });

    it('evaluates a {variable} block from scope', () => {
        expect(resolveValue('{items}', ctx({ items: [1, 2, 3] }))).toEqual([1, 2, 3]);
    });

    it('evaluates an arithmetic {expression}', () => {
        expect(resolveValue('{2 + 3}', ctx())).toBe(5);
    });

    it('evaluates a {ternary} expression', () => {
        expect(resolveValue('{x > 0 ? "pos" : "neg"}', ctx({ x: 1 }))).toBe('pos');
    });

    // --- Object literal fallback ---

    it('resolves an object literal {key: value} via the paren-wrap fallback', () => {
        // `{key: value}` is a syntax error as a bare return statement (labeled statement),
        // so resolveValue wraps it in parens: ({key: value}) → returns an object.
        const result = resolveValue('{label: "hello"}', ctx());
        expect(result).toEqual({ label: 'hello' });
    });

    it('resolves a multi-key object literal', () => {
        const result = resolveValue('{a: 1, b: 2}', ctx());
        expect(result).toEqual({ a: 1, b: 2 });
    });

    // --- Error propagation ---

    it('throws when a {expression} references an unknown variable', () => {
        expect(() => resolveValue('{missing}', ctx())).toThrow(ReferenceError);
    });
});
