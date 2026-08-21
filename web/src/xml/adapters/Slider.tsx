import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';

const sliderPropsSchema = z.object({
    label: xmlNonblankStringSchema,
    max: z.number().optional(),
    min: z.number().optional(),
    step: z.number().optional(),
});

export function Slider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<number>(props, 'value', ctx, (value) => (typeof value === 'number' ? value : 0));
    const { label, max, min, step } = resolveXmlProps(
        props,
        ctx,
        { label: 'raw', max: 'scalar', min: 'scalar', step: 'scalar' },
        sliderPropsSchema
    );

    return (
        <AstryxSlider label={label} max={max} min={min} onChange={binding.setValue} step={step} value={binding.value} />
    );
}
