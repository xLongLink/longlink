import { z } from 'zod';
import { ref } from 'valtio';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { useBindableValue } from '../core/binding';
import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';

const fileInputPropsSchema = z.object({
    accept: z.string().optional().catch(undefined),
    label: z
        .union([z.string(), z.number(), z.boolean()])
        .transform(String)
        .refine((value) => value.trim().length > 0),
});

type FileInputProps = z.infer<typeof fileInputPropsSchema>;

export function FileInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<File | null>(props, 'value', ctx, (value) =>
        typeof File !== 'undefined' && value instanceof File ? value : null
    );
    const { accept, label }: FileInputProps = resolveXmlProps(
        props,
        ctx,
        { accept: 'scalar', label: 'raw' },
        fileInputPropsSchema
    );

    return (
        <AstryxFileInput
            accept={accept}
            label={label}
            onChange={(value) => binding.setValue(value instanceof File ? ref(value) : null)}
            value={binding.value}
        />
    );
}
