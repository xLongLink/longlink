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
    const binding = useBindableValue<File | null>(props, 'value', ctx, (value) =>
        typeof File !== 'undefined' && value instanceof File ? value : null
    );
    const accept = resolveXml(props, 'accept', ctx);
    const description = resolveXml(props, 'description', ctx);
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
            label={requireXmlString(props, 'label', ctx, 'FileInput')}
            labelTooltip={typeof labelTooltip === 'string' ? labelTooltip : undefined}
            mode={mode === 'dropzone' ? mode : 'input'}
            onChange={(value) => binding.setValue(value instanceof File ? ref(value) : null)}
            placeholder={typeof placeholder === 'string' ? placeholder : undefined}
            status={resolveInputStatus(props, ctx)}
            statusVariant={statusVariant}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
        />
    );
}
