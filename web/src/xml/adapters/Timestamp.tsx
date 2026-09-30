import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import * as AstryxTimestamp from '@astryxdesign/core/Timestamp';

const timestampPropsSchema = z.object({
    value: z.union([z.string().min(1), z.number().finite()]),
    format: z
        .enum([
            'relative',
            'relative_short',
            'auto',
            'date',
            'date_long',
            'date_weekday',
            'date_time',
            'time',
            'system_date',
            'system_date_time',
            'system_time',
            'unix_seconds',
        ])
        .default('auto'),
});

/** Displays a timestamp using Astryx's locale-aware formats. */
export function Timestamp({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { value, format } = resolveXmlProps(props, ctx, timestampPropsSchema, ['value']);

    // Delegate parsing, formatting, and semantic markup to the shared component.
    return <AstryxTimestamp.Timestamp value={value} format={format} type="inherit" color="inherit" />;
}
