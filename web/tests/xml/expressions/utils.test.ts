import { isExpression, isReference, isText } from '@xml/expressions';
import { describe, expect, it } from 'bun:test';

describe('expression utils', () => {
    it('detects expression syntax', () => {
        expect(isExpression('${count}')).toBe(true);
        expect(isExpression('count')).toBe(false);
    });

    it('detects reference syntax', () => {
        expect(isReference('$user.name')).toBe(true);
        expect(isReference('user.name')).toBe(false);
    });

    it('detects text values', () => {
        expect(isText('Hello')).toBe(true);
        expect(isText('${count}')).toBe(false);
    });
});
