import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { compileProps, createContext } from '../helpers';
import { resolveXmlProps, xmlSpacingSchema } from '@/xml/core/props';

describe('resolveXmlProps', () => {
    it('resolves scalar and raw props with schema defaults', () => {
        const values = resolveXmlProps(
            compileProps({ count: '2', label: 'Ready' }),
            createContext().scope,
            z.object({ count: z.number(), gap: xmlSpacingSchema.default(1), label: z.string() }),
            ['label']
        );

        expect(values).toEqual({ count: 2, gap: 1, label: 'Ready' });
    });

    it('rejects values outside the declared schema', () => {
        expect(() =>
            resolveXmlProps(
                compileProps({ gap: '7' }),
                createContext().scope,
                z.object({ gap: xmlSpacingSchema.default(1) })
            )
        ).toThrow('gap: must use the spacing scale');
    });
});
