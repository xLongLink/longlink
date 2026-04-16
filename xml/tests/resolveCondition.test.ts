import { describe, it, expect } from 'bun:test';
import { resolveCondition } from '../src/runtime';
import type { ExecutionContext } from '../src/types';

function ctx(scope: Record<string, any> = {}): ExecutionContext {
    return { state: {}, queries: {}, scope };
}

describe('resolveCondition', () => {
    it('returns true when condition is undefined (element always rendered)', () => {
        expect(resolveCondition(undefined, ctx())).toBe(true);
    });

    it('returns false when condition is an empty string', () => {
        expect(resolveCondition('', ctx())).toBe(false);
    });

    it('returns false when condition is whitespace only', () => {
        expect(resolveCondition('   ', ctx())).toBe(false);
    });

    it('resolves {true} to true', () => {
        expect(resolveCondition('{true}', ctx())).toBe(true);
    });

    it('resolves {false} to false', () => {
        expect(resolveCondition('{false}', ctx())).toBe(false);
    });

    it('resolves a comparison expression against scope variables', () => {
        expect(resolveCondition('{count > 0}', ctx({ count: 5 }))).toBe(true);
        expect(resolveCondition('{count > 0}', ctx({ count: 0 }))).toBe(false);
    });

    it('resolves a plain expression string (no braces)', () => {
        // Bare expression without wrapping braces is also supported
        expect(resolveCondition('1 === 1', ctx())).toBe(true);
        expect(resolveCondition('1 === 2', ctx())).toBe(false);
    });

    it('coerces truthy/falsy values to boolean', () => {
        expect(resolveCondition('{0}', ctx())).toBe(false);
        expect(resolveCondition('{1}', ctx())).toBe(true);
        expect(resolveCondition('{""}', ctx())).toBe(false);
        expect(resolveCondition('{"hello"}', ctx())).toBe(true);
    });
});
