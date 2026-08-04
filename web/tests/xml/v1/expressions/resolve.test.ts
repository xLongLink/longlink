import { describe, expect, it } from 'vitest';
import { resolvePath, resolveValue } from '@/xml/v1/expressions';
import type { ExecutionContext } from '@/xml/v1/types';

describe('resolve', () => {
    it('resolves values through scope chains', () => {
        const parent: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            answer: 42,
        };
        const ctx: ExecutionContext = {
            parent,
            setups: {},
            invalidate: async () => {},
            values: {},
        };

        expect(resolveValue(ctx, 'answer')).toBe(42);
    });

    it('resolves dotted paths against nested values', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            user: { profile: { name: 'Ada' } },
        };

        expect(resolvePath(ctx, ['user', 'profile', 'name'])).toBe('Ada');
    });

    it('does not resolve inherited scope values', () => {
        const values = Object.create({ hidden: 'prototype-value' }) as Record<string, unknown>;
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values,
        };

        expect(resolveValue(ctx, 'hidden')).toBeUndefined();
    });

    it('blocks unsafe prototype path segments', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            user: { name: 'Ada' },
        };

        expect(['__proto__', 'constructor', 'prototype'].map((part) => resolvePath(ctx, ['user', part]))).toEqual([
            undefined,
            undefined,
            undefined,
        ]);
    });
});
