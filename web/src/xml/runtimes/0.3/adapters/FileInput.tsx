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

    return (
        <AstryxFileInput
            accept={(() => {
                const value = resolveXml(props, 'accept', ctx);
                return typeof value === 'string' ? value : undefined;
            })()}
            description={(() => {
                const value = resolveXml(props, 'description', ctx);
                return typeof value === 'string' ? value : undefined;
            })()}
            disabledMessage={(() => {
                const value = resolveXml(props, 'disabledMessage', ctx);
                return typeof value === 'string' ? value : undefined;
            })()}
            isDisabled={(() => {
                const value = resolveXml(props, 'isDisabled', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            isLabelHidden={(() => {
                const value = resolveXml(props, 'isLabelHidden', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            isLoading={(() => {
                const value = resolveXml(props, 'isLoading', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            isMultiple={(() => {
                const value = resolveXml(props, 'isMultiple', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            isOptional={(() => {
                const value = resolveXml(props, 'isOptional', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            isRequired={(() => {
                const value = resolveXml(props, 'isRequired', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            label={requireXmlString(props, 'label', ctx, 'FileInput')}
            maxFiles={(() => {
                const value = resolveXml(props, 'maxFiles', ctx);
                return typeof value === 'number' ? value : undefined;
            })()}
            maxSize={(() => {
                const value = resolveXml(props, 'maxSize', ctx);
                return typeof value === 'number' ? value : undefined;
            })()}
            mode={(() => {
                const value = resolveXml(props, 'mode', ctx);
                return isXmlEnum(value, FILE_INPUT_MODES) ? value : 'input';
            })()}
            onChange={binding.setValue}
            placeholder={(() => {
                const value = resolveXml(props, 'placeholder', ctx);
                return typeof value === 'string' ? value : undefined;
            })()}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={(() => {
                const value = resolveXml(props, 'width', ctx);
                return typeof value === 'string' || typeof value === 'number' ? value : undefined;
            })()}
        />
    );
}
