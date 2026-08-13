import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core-0-3/CheckboxInput';
import type { Props } from '../types';
import { COMPACT_SIZES } from '../constants';
import { resolveInputStatus } from './input';
import { useXmlRuntime } from '../core/context';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

/**
 * https://astryx.atmeta.com/components/CheckboxInput?tab=properties
 * - label: string
 * - description: string
 * - disabledMessage: string
 * - htmlName: string
 * - value: bool
 * - isLoading: bool
 * - isDisabled: bool
 * - isOptional: bool
 * - isReadOnly: bool
 * - isRequired: bool
 * - isLabelHidden: bool
 * - size: str
 * - width: str | int
 * - status: str
 * - statusMessage: string
 */
export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, toXmlBoolean);
    const size = resolveXml(props, 'size', ctx);
    const width = resolveXml(props, 'width', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isReadOnly = resolveXml(props, 'isReadOnly', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);

    if (size != null && !isXmlEnum(size, COMPACT_SIZES)) {
        throw new Error(`Unsupported CheckboxInput size '${String(size)}'`);
    }

    return (
        <AstryxCheckboxInput
            size={size}
            label={requireXmlString(props, 'label', ctx, 'CheckboxInput')}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            status={resolveInputStatus(props, ctx)}
            htmlName={typeof htmlName === 'string' ? htmlName : undefined}
            onChange={binding.setValue}
            isLoading={typeof isLoading === 'boolean' ? isLoading : undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isOptional={typeof isOptional === 'boolean' ? isOptional : undefined}
            isReadOnly={typeof isReadOnly === 'boolean' ? isReadOnly : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            description={typeof description === 'string' ? description : undefined}
            isLabelHidden={typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined}
            disabledMessage={typeof disabledMessage === 'string' ? disabledMessage : undefined}
        />
    );
}
