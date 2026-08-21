import { z } from 'zod';
import { ref } from 'valtio';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';
import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';

const fileInputPropsSchema = z.object({
    accept: z.string().optional(),
    label: xmlNonblankStringSchema,
});

export function FileInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<File | null>(props, 'value', ctx, (value) =>
        typeof File !== 'undefined' && value instanceof File ? value : null
    );
    const { accept, label } = resolveXmlProps(props, ctx, { accept: 'scalar', label: 'raw' }, fileInputPropsSchema);

    return (
        <AstryxFileInput
            accept={accept}
            label={label}
            onChange={(value) => binding.setValue(value instanceof File ? ref(value) : null)}
            value={binding.value}
        />
    );
}
