import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';
import { ProgressBar as AstryxProgressBar } from '@astryxdesign/core/ProgressBar';

const numberFormatter = new Intl.NumberFormat();

/** Formats bytes using binary units for admin resource tables. */
function formatBytes(bytes: number): string {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unit = 0;

    // Scale bytes until they fit the current unit.
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${numberFormatter.format(Math.round(value))} ${units[unit]}`;
}

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
