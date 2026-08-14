import { describe, expect, it } from 'vitest';
import type { Scope } from '@/xml/types';
import { resolvePath, resolveValue } from '@/xml/expressions';

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
        const bindings = Object.create({ hidden: 'prototype-value' }) as Record<string, unknown>;
        const ctx: Scope = { bindings };

        expect(resolveValue(ctx, 'hidden')).toBeUndefined();
    });

    it('blocks unsafe prototype path segments', () => {
        const ctx: Scope = { bindings: { user: { name: 'Ada' } } };

        expect(['__proto__', 'constructor', 'prototype'].map((part) => resolvePath(ctx, ['user', part]))).toEqual([
            undefined,
            undefined,
            undefined,
        ]);
    });
});
