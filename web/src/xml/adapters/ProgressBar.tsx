import { z } from 'zod';
import type { Props } from '../types';
import { formatBytes } from '@/lib/utils';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';
import { ProgressBar as AstryxProgressBar } from '@astryxdesign/core/ProgressBar';

const progressBarPropsSchema = xmlLabelPropsSchema.extend({
    max: z.number().positive(),
    value: z.number().nonnegative(),
});

/** Renders a progress bar with optional byte-formatted usage text. */
export function ProgressBar({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { label, max, value } = resolveXmlProps(props, ctx, progressBarPropsSchema);

    return (
        <AstryxProgressBar
            formatValueLabel={(current) => `${formatBytes(current)} used / ${formatBytes(max)}`}
            hasValueLabel
            label={label}
            max={max}
            value={value}
            variant="neutral"
        />
    );
}
