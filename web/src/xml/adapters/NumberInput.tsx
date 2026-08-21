import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { useBindableValue } from '../core/binding';
import { NumberInput as AstryxNumberInput } from '@astryxdesign/core/NumberInput';

const numberInputPropsSchema = z.object({
    label: z
        .union([z.string(), z.number(), z.boolean()])
        .transform(String)
        .refine((value) => value.trim().length > 0),
    max: z.number().optional().catch(undefined),
    min: z.number().optional().catch(undefined),
    step: z.number().optional().catch(undefined),
});

type NumberInputProps = z.infer<typeof numberInputPropsSchema>;

export function NumberInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? undefined : Number(value)));
    const { label, max, min, step }: NumberInputProps = resolveXmlProps(
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
