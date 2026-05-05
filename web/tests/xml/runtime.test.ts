import { describe, expect, it } from 'bun:test';
import { evaluate, resolveBinding, resolveCondition } from '../../src/xml/runtime';
import type { ExecutionContext } from '../../src/xml/types';

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

describe('resolveCondition', () => {
    /* Missing conditions default to true, but blank strings should not render. */
    it('handles empty and missing conditions', () => {
        const ctx: ExecutionContext = {};

        expect(resolveCondition(undefined, ctx)).toBe(true);
        expect(resolveCondition('   ', ctx)).toBe(false);
    });

    /* Conditional expressions must be explicit expressions, not raw text. */
    it('evaluates braced conditions and rejects plain text', () => {
        const ctx: ExecutionContext = {
            count: 2,
        };

        expect(resolveCondition('{count > 1}', ctx)).toBe(true);
        expect(resolveCondition('{count < 1}', ctx)).toBe(false);
    });
});

describe('resolveBinding', () => {
    /* $ targets should read and write nested state through one resolved binding. */
    it('resolves nested $ value and setter', () => {
        let latestValue: unknown;
        const current = { value: 'draft', placeholder: 'Name' };
        const setter = (value: unknown) => {
            latestValue = typeof value === 'function' ? (value as (prev: unknown) => unknown)(current) : value;
        };

        const ctx: ExecutionContext = { form: current };

        const binding = resolveBinding('form.value', ctx, { form: setter });
        binding.setValue('saved');

        expect(binding.value).toBe('draft');
        expect(latestValue).toEqual({ value: 'saved', placeholder: 'Name' });
    });

    /* Missing state keys should produce a clear runtime error. */
    it('throws when target state key is missing', () => {
        const ctx: ExecutionContext = {};

        expect(() => resolveBinding('missing.value', ctx)).toThrow('Unknown state "missing"');
    });
});
