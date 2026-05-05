import { describe, expect, it } from 'bun:test';
import { evaluate, resolveBind, resolveCondition, resolveValue } from '../../src/xml/runtime';
import type { ExecutionContext } from '../../src/xml/types';

describe('evaluate', () => {
    /* Evaluation should see state first, then queries, and finally scope overrides. */
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
    /* Plain text should stay untouched when the value is not an expression wrapper. */
    it('returns literal text when not wrapped in braces', () => {
        const ctx: ExecutionContext = {
            state: { count: [4, () => {}] },
            queries: {},
            scope: {},
        };

        expect(resolveValue('Count: {count}', ctx)).toBe('Count: {count}');
    });

    /* A single braced expression should return its typed runtime value. */
    it('returns typed value for single expression', () => {
        const ctx: ExecutionContext = {
            state: { count: [4, () => {}] },
            queries: {},
            scope: {},
        };

        expect(resolveValue('{count * 2}', ctx)).toBe(8);
    });

    /* Object literals inside braces should be evaluated as objects, not strings. */
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
    /* Missing conditions default to true, but blank strings should not render. */
    it('handles empty and missing conditions', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(resolveCondition(undefined, ctx)).toBe(true);
        expect(resolveCondition('   ', ctx)).toBe(false);
    });

    /* Conditional expressions must be explicit expressions, not raw text. */
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

describe('resolveBind', () => {
    /* Bind targets should read and write nested state through one resolved binding. */
    it('resolves nested bind value and setter', () => {
        let latestValue: unknown;
        const current = { value: 'draft', placeholder: 'Name' };
        const setter = (value: unknown) => {
            latestValue = typeof value === 'function' ? (value as (prev: unknown) => unknown)(current) : value;
        };

        const ctx: ExecutionContext = {
            state: { form: [current, setter] },
            queries: {},
            scope: {},
        };

        const binding = resolveBind('form.value', ctx);
        binding.setValue('saved');

        expect(binding.value).toBe('draft');
        expect(latestValue).toEqual({ value: 'saved', placeholder: 'Name' });
    });

    /* Missing state keys should produce a clear runtime error. */
    it('throws when target state key is missing', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };

        expect(() => resolveBind('missing.value', ctx)).toThrow('bind: unknown state "missing"');
    });
});
