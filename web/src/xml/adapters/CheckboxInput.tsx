import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';

const checkboxInputPropsSchema = xmlLabelPropsSchema.extend({
    isDisabled: z.boolean().default(false),
    property: z.string().optional(),
});

export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { isDisabled, label, property } = resolveXmlProps(props, ctx, checkboxInputPropsSchema, ['label']);
    const binding = useBindableValue(props, 'value', ctx, (value) => value === true || value === 'true', property);

    return (
        <AstryxCheckboxInput
            label={label}
            size="sm"
            value={binding.value}
            isDisabled={isDisabled}
            onChange={binding.setValue}
        />
    );
}
