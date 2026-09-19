import { z } from 'zod';
import { useEffect } from 'react';
import type { Props } from '@/xml/types';
import { useXmlRuntime } from '@/xml/core/context';
import { resolveXmlProps, xmlNonblankStringSchema } from '@/xml/core/props';

const invalidatePropsSchema = z.object({ query: xmlNonblankStringSchema });

/** Re-fetches a declared Query setup when mounted. */
export function Invalidate({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const { query } = resolveXmlProps(props, ctx, invalidatePropsSchema);
    const known = query in services.setups;

    useEffect(() => {
        if (!known) return;

        void services.invalidate(query);
    }, [known, query, services]);

    if (!known) {
        throw new Error(`Invalidate query "${query}" does not reference a declared State or Query`);
    }

    return null;
}
