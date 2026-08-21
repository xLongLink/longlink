import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { useBindableValue } from '../core/binding';
import { TextArea as AstryxTextArea } from '@astryxdesign/core/TextArea';

const textAreaPropsSchema = z.object({
    label: z
        .union([z.string(), z.number(), z.boolean()])
        .transform(String)
        .refine((value) => value.trim().length > 0),
});

type TextAreaProps = z.infer<typeof textAreaPropsSchema>;

export function TextArea({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const { label }: TextAreaProps = resolveXmlProps(props, ctx, { label: 'raw' }, textAreaPropsSchema);

    return <AstryxTextArea label={label} value={binding.value} onChange={binding.setValue} />;
}
