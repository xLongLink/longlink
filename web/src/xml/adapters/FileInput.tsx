import { ref } from 'valtio';
import type { Props } from '../types';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { FIELD_STATUS_VARIANTS } from '../constants';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';

export function FileInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value): File | File[] | null =>
        value == null ||
        typeof File === 'undefined' ||
        (!(value instanceof File) && !(Array.isArray(value) && value.every((entry) => entry instanceof File)))
            ? null
            : value
    );
    const accept = resolveXml(props, 'accept', ctx);
    const description = resolveXml(props, 'description', ctx);
    const isMultiple = resolveXml(props, 'isMultiple', ctx);
    const maxFiles = resolveXml(props, 'maxFiles', ctx);
    const maxSize = resolveXml(props, 'maxSize', ctx);
    const mode = resolveXml(props, 'mode', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const width = resolveXml(props, 'width', ctx);

    if (!isXmlEnum(statusVariant, [undefined, ...FIELD_STATUS_VARIANTS])) {
        throw new Error(`Unsupported FileInput statusVariant '${String(statusVariant)}'`);
    }

    return (
        <AstryxFileInput
            accept={typeof accept === 'string' ? accept : undefined}
            description={typeof description === 'string' ? description : undefined}
            isMultiple={typeof isMultiple === 'boolean' ? isMultiple : undefined}
            label={requireXmlString(props, 'label', ctx, 'FileInput')}
            labelTooltip={typeof labelTooltip === 'string' ? labelTooltip : undefined}
            maxFiles={typeof maxFiles === 'number' ? maxFiles : undefined}
            maxSize={typeof maxSize === 'number' ? maxSize : undefined}
            mode={mode === 'dropzone' ? mode : 'input'}
            onChange={(value) => binding.setValue(value == null ? value : ref(value))}
            placeholder={typeof placeholder === 'string' ? placeholder : undefined}
            status={resolveInputStatus(props, ctx)}
            statusVariant={statusVariant}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
        />
    );
}
