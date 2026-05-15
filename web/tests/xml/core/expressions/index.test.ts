import { compile, evaluate, isExpression, isReference, isText } from '@xml/core/expressions';
import { describe, expect, it } from 'bun:test';

describe('expressions barrel', () => {
    it('re-exports the expression helpers', () => {
        expect(typeof compile).toBe('function');
        expect(typeof evaluate).toBe('function');
        expect(isExpression('{x}')).toBe(true);
        expect(isReference('$x.y')).toBe(true);
        expect(isText('hello')).toBe(true);
    });
});
