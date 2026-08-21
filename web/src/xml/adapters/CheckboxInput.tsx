import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { useBindableValue } from '../core/binding';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';

const checkboxInputPropsSchema = z.object({
    label: z
        .union([z.string(), z.number(), z.boolean()])
        .transform(String)
        .refine((value) => value.trim().length > 0),
});

type CheckboxInputProps = z.infer<typeof checkboxInputPropsSchema>;

export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<boolean>(props, 'value', ctx, (value) => value === true || value === 'true');
    const { label }: CheckboxInputProps = resolveXmlProps(props, ctx, { label: 'raw' }, checkboxInputPropsSchema);

    return <AstryxCheckboxInput label={label} size="sm" value={binding.value} onChange={binding.setValue} />;
}
