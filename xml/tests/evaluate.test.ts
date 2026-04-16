import { describe, it, expect } from 'bun:test';
import { evaluate } from '../src/runtime';
import type { ExecutionContext } from '../src/types';

// Minimal context factory to keep tests concise
function ctx(
    state: Record<string, any> = {},
    queries: Record<string, any> = {},
    scope: Record<string, any> = {}
): ExecutionContext {
    // State entries must be [value, setter] tuples — only the value is exposed to expressions
    return {
        state: Object.fromEntries(Object.entries(state).map(([k, v]) => [k, [v, () => {}]])),
        queries,
        scope,
    };
}

describe('evaluate', () => {
    it('evaluates a literal number expression', () => {
        expect(evaluate('1 + 2', ctx())).toBe(3);
    });

    it('evaluates a literal string expression', () => {
        expect(evaluate('"hello"', ctx())).toBe('hello');
    });

    it('evaluates a boolean expression', () => {
        expect(evaluate('true', ctx())).toBe(true);
        expect(evaluate('false', ctx())).toBe(false);
    });

    it('reads a variable from state', () => {
        expect(evaluate('count', ctx({ count: 7 }))).toBe(7);
    });

    it('reads a variable from queries', () => {
        expect(evaluate('user', ctx({}, { user: { name: 'Alice' } }))).toEqual({ name: 'Alice' });
    });

    it('reads a variable from scope', () => {
        expect(evaluate('item', ctx({}, {}, { item: 42 }))).toBe(42);
    });

    it('scope takes priority over state and queries when keys collide', () => {
        // Same key in all three sources — scope wins
        expect(evaluate('x', ctx({ x: 1 }, { x: 2 }, { x: 3 }))).toBe(3);
    });

    it('evaluates an expression referencing multiple context sources', () => {
        const c = ctx({ base: 10 }, {}, { offset: 5 });
        expect(evaluate('base + offset', c)).toBe(15);
    });

    it('evaluates a ternary expression', () => {
        expect(evaluate('count > 0 ? "yes" : "no"', ctx({ count: 5 }))).toBe('yes');
        expect(evaluate('count > 0 ? "yes" : "no"', ctx({ count: 0 }))).toBe('no');
    });

    it('throws ReferenceError for unknown variables', () => {
        expect(() => evaluate('undeclared', ctx())).toThrow(ReferenceError);
    });

    it('throws SyntaxError for invalid expression syntax', () => {
        expect(() => evaluate('???', ctx())).toThrow(SyntaxError);
    });
});
