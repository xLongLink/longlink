import { TextInput as AstryxTextInput } from '@astryxdesign/core-0-3/TextInput';
import type { Props } from '../types';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { FIELD_STATUS_VARIANTS, SIZES, TEXT_INPUT_TYPES } from '../constants';

/**
 * checked: false
 * https://astryx.atmeta.com/components/TextInput?tab=properties
 * - label: string
 * - htmlName: string
 * - description: string
 * - placeholder: string
 * - labelTooltip: string
 * - disabledMessage: string
 * - value: string
 * - type: str
 * - size: str
 * - hasClear: bool
 * - isLoading: bool
 * - isDisabled: bool
 * - isOptional: bool
 * - isRequired: bool
 * - hasAutoFocus: bool
 * - isLabelHidden: bool
 * - width: str | int
 * - status: str
 * - statusMessage: string
 * - statusVariant: str
 */
export function TextInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const type = resolveXml(props, 'type', ctx);
    const size = resolveXml(props, 'size', ctx);
    const label = requireXmlString(props, 'label', ctx, 'TextInput');
    const width = resolveXml(props, 'width', ctx);
    const hasClear = resolveXml(props, 'hasClear', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const hasAutoFocus = resolveXml(props, 'hasAutoFocus', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);

    if (!isXmlEnum(type, [undefined, ...TEXT_INPUT_TYPES])) {
        throw new Error(`Unsupported TextInput type '${String(type)}'`);
    }

    if (!isXmlEnum(size, [undefined, ...SIZES])) {
        throw new Error(`Unsupported TextInput size '${String(size)}'`);
    }

    if (!isXmlEnum(statusVariant, [undefined, ...FIELD_STATUS_VARIANTS])) {
        throw new Error(`Unsupported TextInput statusVariant '${String(statusVariant)}'`);
    }

    return (
        <AstryxTextInput
            type={type}
            size={size}
            label={label}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            status={resolveInputStatus(props, ctx)}
            hasClear={typeof hasClear === 'boolean' ? hasClear : undefined}
            htmlName={typeof htmlName === 'string' ? htmlName : undefined}
            onChange={binding.setValue}
            isLoading={typeof isLoading === 'boolean' ? isLoading : undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isOptional={typeof isOptional === 'boolean' ? isOptional : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            description={typeof description === 'string' ? description : undefined}
            placeholder={typeof placeholder === 'string' ? placeholder : undefined}
            hasAutoFocus={typeof hasAutoFocus === 'boolean' ? hasAutoFocus : undefined}
            labelTooltip={typeof labelTooltip === 'string' ? labelTooltip : undefined}
            isLabelHidden={typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined}
            statusVariant={statusVariant}
            disabledMessage={typeof disabledMessage === 'string' ? disabledMessage : undefined}
        />
    );
}
