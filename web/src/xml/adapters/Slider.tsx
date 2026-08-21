import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { useBindableValue } from '../core/binding';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';

const sliderPropsSchema = z.object({
    label: z
        .union([z.string(), z.number(), z.boolean()])
        .transform(String)
        .refine((value) => value.trim().length > 0),
    max: z.number().optional().catch(undefined),
    min: z.number().optional().catch(undefined),
    step: z.number().optional().catch(undefined),
});

type SliderProps = z.infer<typeof sliderPropsSchema>;

export function Slider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<number>(props, 'value', ctx, (value) => (typeof value === 'number' ? value : 0));
    const { label, max, min, step }: SliderProps = resolveXmlProps(
        props,
        ctx,
        { label: 'raw', max: 'scalar', min: 'scalar', step: 'scalar' },
        sliderPropsSchema
    );

    const commonProps = {
        label,
        max,
        min,
        step,
    };

    return <AstryxSlider {...commonProps} onChange={binding.setValue} value={binding.value} />;
}
