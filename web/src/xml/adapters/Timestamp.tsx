import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';

const timestampPropsSchema = z.object({
    value: z.union([z.string().min(1), z.number().finite()]),
    format: z.enum(['year', 'month', 'date', 'minute', 'second']).default('second'),
});

const formatOptions = {
    year: { year: 'numeric' },
    month: { year: 'numeric', month: 'numeric' },
    date: { year: 'numeric', month: 'numeric', day: 'numeric' },
    minute: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' },
    second: {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
    },
} satisfies Record<z.output<typeof timestampPropsSchema>['format'], Intl.DateTimeFormatOptions>;

/** Displays a timestamp in the viewer's locale at the requested precision. */
export function Timestamp({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { value, format } = resolveXmlProps(props, ctx, timestampPropsSchema, ['value']);

    // Preserve the full instant in markup while displaying the requested precision.
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const iso = date.toISOString();

    return <time dateTime={iso}>{new Intl.DateTimeFormat(undefined, formatOptions[format]).format(date)}</time>;
}
