import type { Scope } from '@/xml/types';
import { describe, expect, it } from 'vitest';
import { resolvePath, resolveValue } from '@/xml/expressions/resolve';

describe('resolve', () => {
    it('resolves values through scope chains', () => {
        const parent: Scope = { bindings: { answer: 42 } };
        const ctx: Scope = { parent, bindings: {} };

        expect(resolveValue(ctx, 'answer')).toBe(42);
    });

    it('resolves dotted paths against nested values', () => {
        const ctx: Scope = { bindings: { user: { profile: { name: 'Ada' } } } };

        expect(resolvePath(ctx, ['user', 'profile', 'name'])).toBe('Ada');
    });

    it('does not resolve inherited scope values', () => {
        const bindings: Record<string, unknown> = {};
        Object.setPrototypeOf(bindings, { hidden: 'prototype-value' });
        const ctx: Scope = { bindings };

        expect(resolveValue(ctx, 'hidden')).toBeUndefined();
    });

    it.each(['__proto__', 'constructor', 'prototype'])('blocks unsafe prototype path segment: %s', (part) => {
        const ctx: Scope = { bindings: { user: { name: 'Ada' } } };

        expect(resolvePath(ctx, ['user', part])).toBeUndefined();
    });
});
