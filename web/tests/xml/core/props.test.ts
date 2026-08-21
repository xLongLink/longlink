import { z } from 'zod';
import { compileProps } from '../helpers';
import { describe, expect, it } from 'vitest';
import { createContext } from '@/xml/core/context';
import { resolveXmlProps, xmlSpacingWithDefaultSchema } from '@/xml/core/props';

describe('resolveXmlProps', () => {
    it('resolves scalar, raw, and literal props with schema defaults', () => {
        const values = resolveXmlProps(
            compileProps({ count: '2', label: 'Ready', state: 'filters' }),
            createContext().scope,
            { count: 'scalar', label: 'raw', state: 'literal' },
            z.object({ count: z.number(), gap: xmlSpacingWithDefaultSchema, label: z.string(), state: z.string() })
        );

        expect(values).toEqual({ count: 2, gap: 3, label: 'Ready', state: 'filters' });
    });

    it('rejects values outside the declared schema', () => {
        expect(() =>
            resolveXmlProps(
                compileProps({ gap: '7' }),
                createContext().scope,
                { gap: 'scalar' },
                z.object({ gap: xmlSpacingWithDefaultSchema })
            )
        ).toThrow('gap: must use the spacing scale');
    });
});
