import { describe, expect, it } from 'bun:test';
import { evaluate, resolveCondition, resolveSet, resolveValue } from '../../src/xml/runtime';
import type { ExecutionContext } from '../../src/xml/types';

describe('evaluate', () => {
    it('resolves state, queries, and scope with scope precedence', () => {
        const ctx: ExecutionContext = {
            state: {
                count: [1, () => {}],
                name: ['from-state', () => {}],
            },
            queries: {
                total: 10,
                name: 'from-query',
            },
            scope: {
                name: 'from-scope',
            },
        };

        expect(evaluate('count + total', ctx)).toBe(11);
        expect(evaluate('name', ctx)).toBe('from-scope');
    });
});

describe('resolveValue', () => {
    it('returns literal text when not wrapped in braces', () => {
        const ctx: ExecutionContext = {
            state: { count: [4, () => {}] },
            queries: {},
            scope: {},
        };

        expect(resolveValue('Count: {count}', ctx)).toBe('Count: {count}');
    });

    it('returns typed value for single expression', () => {
        const ctx: ExecutionContext = {
            state: { count: [4, () => {}] },
            queries: {},
            scope: {},
        };

        expect(resolveValue('{count * 2}', ctx)).toBe(8);
    });

    it('parses object literals wrapped in braces', () => {
        const ctx: ExecutionContext = {
            state: { value: [5, () => {}] },
            queries: {},
            scope: {},
        };

        expect(resolveValue('{next: value + 1}', ctx)).toEqual({ next: 6 });
    });
});

describe('resolveCondition', () => {
    it('handles empty and missing conditions', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(resolveCondition(undefined, ctx)).toBe(true);
        expect(resolveCondition('   ', ctx)).toBe(false);
    });

    it('evaluates braced conditions and rejects plain text', () => {
        const ctx: ExecutionContext = {
            state: { count: [2, () => {}] },
            queries: {},
            scope: {},
        };

        expect(resolveCondition('{count > 1}', ctx)).toBe(true);
        expect(resolveCondition('count < 1', ctx)).toBe(false);
    });
});

describe('resolveSet', () => {
    it('sets whole state when target has no path', () => {
        let latestValue: unknown;
        const setter = (value: unknown) => {
            latestValue = value;
        };

        const ctx: ExecutionContext = {
            state: { filter: ['day', setter] },
            queries: {},
            scope: {},
        };

        const handler = resolveSet('filter', "'week'", ctx);
        handler();

        expect(latestValue).toBe('week');
    });

    it('sets nested value immutably when target has deep path', () => {
        let latestValue: unknown;
        const current = { range: { from: 1, to: 2 }, untouched: true };
        const setter = (value: unknown) => {
            latestValue = typeof value === 'function' ? (value as (prev: unknown) => unknown)(current) : value;
        };

        const ctx: ExecutionContext = {
            state: { filter: [current, setter] },
            queries: {},
            scope: {},
        };

        const handler = resolveSet('filter.range.to', '3', ctx);
        handler();

        expect(latestValue).toEqual({ range: { from: 1, to: 3 }, untouched: true });
        expect(current).toEqual({ range: { from: 1, to: 2 }, untouched: true });
    });

    it('throws when target state key is missing', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(() => resolveSet('missing.value', '1', ctx)).toThrow('set: unknown state "missing"');
    });
});
