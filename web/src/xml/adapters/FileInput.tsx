import { ref } from 'valtio';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { requireXmlString, resolveXml } from '../core/props';
import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';

export function FileInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<File | null>(props, 'value', ctx, (value) =>
        typeof File !== 'undefined' && value instanceof File ? value : null
    );
    const accept = resolveXml(props, 'accept', ctx);
    return (
        <AstryxFileInput
            accept={typeof accept === 'string' ? accept : undefined}
            label={requireXmlString(props, 'label', ctx, 'FileInput')}
            onChange={(value) => binding.setValue(value instanceof File ? ref(value) : null)}
            value={binding.value}
        />
    );
}
