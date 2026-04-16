import { describe, it, expect } from 'bun:test';
import { interpolate } from '../src/runtime';
import type { ExecutionContext } from '../src/types';

function ctx(scope: Record<string, any> = {}): ExecutionContext {
    return { state: {}, queries: {}, scope };
}

describe('interpolate', () => {
    it('returns the original string when there are no placeholders', () => {
        expect(interpolate('Hello World', ctx())).toBe('Hello World');
    });

    it('replaces a single {expr} placeholder', () => {
        expect(interpolate('Hello {name}!', ctx({ name: 'Alice' }))).toBe('Hello Alice!');
    });

    it('replaces multiple {expr} placeholders in one string', () => {
        expect(interpolate('{first} {last}', ctx({ first: 'John', last: 'Doe' }))).toBe('John Doe');
    });

    it('coerces non-string expression results to strings', () => {
        expect(interpolate('Count: {n}', ctx({ n: 42 }))).toBe('Count: 42');
        expect(interpolate('Active: {flag}', ctx({ flag: true }))).toBe('Active: true');
    });

    it('evaluates inline arithmetic inside placeholders', () => {
        expect(interpolate('Result: {a + b}', ctx({ a: 3, b: 4 }))).toBe('Result: 7');
    });

    it('leaves text outside placeholders untouched', () => {
        expect(interpolate('prefix {x} suffix', ctx({ x: '!' }))).toBe('prefix ! suffix');
    });

    it('throws when a placeholder references an unknown variable', () => {
        // Errors in expressions should propagate so template mistakes are visible
        expect(() => interpolate('{missing}', ctx())).toThrow(ReferenceError);
    });
});
