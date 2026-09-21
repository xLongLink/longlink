import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { createContext, parseFragment } from '../helpers';
import { resolveXmlProps, xmlSpacingSchema } from '@/xml/core/props';

describe('resolveXmlProps', () => {
    it('resolves scalar and raw props with schema defaults', () => {
        const values = resolveXmlProps(
            parseFragment('<Widget count="2" label="Ready" />')[0].params,
            createContext().scope,
            z.object({ count: z.number(), gap: xmlSpacingSchema.default(1), label: z.string() }),
            ['label']
        );

        expect(values).toEqual({ count: 2, gap: 1, label: 'Ready' });
    });

    it('rejects values outside the declared schema', () => {
        expect(() =>
            resolveXmlProps(
                parseFragment('<Widget gap="7" />')[0].params,
                createContext().scope,
                z.object({ gap: xmlSpacingSchema.default(1) })
            )
        ).toThrow('gap: must use the spacing scale');
    });
});
