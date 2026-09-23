import { z } from 'zod';
import { useEffect } from 'react';
import type { Props } from '@/xml/types';
import { useXmlRuntime } from '@/xml/core/context';
import { evaluate } from '@/xml/expressions/evaluate';
import { resolveValue } from '@/xml/expressions/resolve';
import { applyDeclaredStatePatch, isValtioProxy } from '@/xml/core/state';
import { readXmlProp, resolveXmlProps, xmlNonblankStringSchema } from '@/xml/core/props';

const invalidatePropsSchema = z.object({
    query: xmlNonblankStringSchema,
    state: xmlNonblankStringSchema.optional(),
});

/** Re-fetches a declared Query setup and optionally patches State after success. */
export function Invalidate({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const { query, state } = resolveXmlProps(props, ctx, invalidatePropsSchema);
    const value = readXmlProp(props, 'value');
    const known = query in services.setups;

    useEffect(() => {
        if (!known) return;

        void services.invalidate(query).then((completed) => {
            // Apply the optional state transition only after a successful refresh.
            if (!completed || state == null || value == null) return;

            const target = resolveValue(ctx, state);
            const patch = evaluate(value, ctx);
            if (!isValtioProxy(target) || patch == null || typeof patch !== 'object' || Array.isArray(patch)) {
                throw new Error('Invalidate value must target a declared State with an object patch');
            }

            applyDeclaredStatePatch(target, patch, 'Invalidate');
        });
    }, [ctx, known, query, services, state, value]);

    if (!known) {
        throw new Error(`Invalidate query "${query}" does not reference a declared State or Query`);
    }
    if ((state == null) !== (value == null)) {
        throw new Error('Invalidate requires both state and value for a follow-up patch');
    }

    return null;
}
