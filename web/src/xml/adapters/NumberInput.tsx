import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';
import { NumberInput as AstryxNumberInput } from '@astryxdesign/core/NumberInput';

const numberInputPropsSchema = z.object({
    label: xmlNonblankStringSchema,
    max: z.number().optional(),
    min: z.number().optional(),
    step: z.number().optional(),
});

export function NumberInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? undefined : Number(value)));
    const { label, max, min, step } = resolveXmlProps(
        props,
        ctx,
        { label: 'raw', max: 'scalar', min: 'scalar', step: 'scalar' },
        numberInputPropsSchema
    );

    return (
        <AstryxNumberInput
            max={max}
            min={min}
            step={step}
            label={label}
            value={binding.value}
            onChange={binding.setValue}
        />
    );
}
