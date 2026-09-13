import { z } from 'zod';
import type { Props } from '../types';
import { TEXT_INPUT_TYPES } from '../constants';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';
import { TextInput as AstryxTextInput } from '@astryxdesign/core/TextInput';

const textInputPropsSchema = z.object({
    isRequired: z.boolean().default(false),
    label: xmlNonblankStringSchema,
    placeholder: z.string().optional(),
    type: z.enum(TEXT_INPUT_TYPES).optional(),
});

export function TextInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const { isRequired, label, placeholder, type } = resolveXmlProps(props, ctx, textInputPropsSchema, ['label']);

    return (
        <AstryxTextInput
            type={type}
            label={label}
            value={binding.value}
            isRequired={isRequired}
            placeholder={placeholder}
            onChange={binding.setValue}
        />
    );
}
