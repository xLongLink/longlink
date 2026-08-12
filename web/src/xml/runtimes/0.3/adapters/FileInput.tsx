import { FileInput as AstryxFileInput } from '@astryxdesign/core-0-3/FileInput';
import type { Props } from '../types';
import { resolveInputStatus } from './input';
import { FILE_INPUT_MODES } from '../constants';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

/** Renders an Astryx file field while keeping File values available to FormData actions. */
export function FileInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(
        props,
        'value',
        ctx,
        (value): File | File[] | null =>
            value == null ||
            typeof File === 'undefined' ||
            (!(value instanceof File) && !(Array.isArray(value) && value.every((entry) => entry instanceof File)))
                ? null
                : value,
        'file',
        () => null
    );
    const accept = resolveXml(props, 'accept', ctx);
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isMultiple = resolveXml(props, 'isMultiple', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const maxFiles = resolveXml(props, 'maxFiles', ctx);
    const maxSize = resolveXml(props, 'maxSize', ctx);
    const mode = resolveXml(props, 'mode', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const width = resolveXml(props, 'width', ctx);

    return (
        <AstryxFileInput
            accept={typeof accept === 'string' ? accept : undefined}
            description={typeof description === 'string' ? description : undefined}
            disabledMessage={typeof disabledMessage === 'string' ? disabledMessage : undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isLabelHidden={typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined}
            isLoading={typeof isLoading === 'boolean' ? isLoading : undefined}
            isMultiple={typeof isMultiple === 'boolean' ? isMultiple : undefined}
            isOptional={typeof isOptional === 'boolean' ? isOptional : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            label={requireXmlString(props, 'label', ctx, 'FileInput')}
            maxFiles={typeof maxFiles === 'number' ? maxFiles : undefined}
            maxSize={typeof maxSize === 'number' ? maxSize : undefined}
            mode={isXmlEnum(mode, FILE_INPUT_MODES) ? mode : 'input'}
            onChange={binding.setValue}
            placeholder={typeof placeholder === 'string' ? placeholder : undefined}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
        />
    );
}
