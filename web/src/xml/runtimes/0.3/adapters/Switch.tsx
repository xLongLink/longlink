import { Switch as AstryxSwitch } from '@astryxdesign/core-0-3/Switch';
import type { Props } from '../types';
import { resolveInputStatus } from './input';
import { useXmlRuntime } from '../core/context';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { COMPACT_SIZES, SWITCH_LABEL_POSITIONS, SWITCH_LABEL_SPACINGS } from '../constants';

/**
 * checked: false
 * https://astryx.atmeta.com/components/Switch?tab=properties
 * - label: string
 * - description: string
 * - disabledMessage: string
 * - htmlName: string
 * - labelTooltip: string
 * - value: bool
 * - isLoading: bool
 * - isDisabled: bool
 * - isOptional: bool
 * - isRequired: bool
 * - isLabelHidden: bool
 * - size: str
 * - labelSpacing: int | float
 * - labelPosition: str
 * - width: str | int
 * - status: str
 * - statusMessage: string
 */
export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, toXmlBoolean);
    const size = resolveXml(props, 'size', ctx);
    const width = resolveXml(props, 'width', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const labelSpacing = resolveXml(props, 'labelSpacing', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const labelPosition = resolveXml(props, 'labelPosition', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);

    if (labelPosition != null && !isXmlEnum(labelPosition, SWITCH_LABEL_POSITIONS)) {
        throw new Error(`Unsupported Switch labelPosition '${String(labelPosition)}'`);
    }

    if (labelSpacing != null && !isXmlEnum(labelSpacing, SWITCH_LABEL_SPACINGS)) {
        throw new Error(`Unsupported Switch labelSpacing '${String(labelSpacing)}'`);
    }

    if (size != null && !isXmlEnum(size, COMPACT_SIZES)) {
        throw new Error(`Unsupported Switch size '${String(size)}'`);
    }

    return (
        <AstryxSwitch
            size={size}
            label={requireXmlString(props, 'label', ctx, 'Switch')}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            status={resolveInputStatus(props, ctx)}
            htmlName={typeof htmlName === 'string' ? htmlName : undefined}
            onChange={binding.setValue}
            isLoading={typeof isLoading === 'boolean' ? isLoading : undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isOptional={typeof isOptional === 'boolean' ? isOptional : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            description={typeof description === 'string' ? description : undefined}
            labelSpacing={labelSpacing}
            labelTooltip={typeof labelTooltip === 'string' ? labelTooltip : undefined}
            labelPosition={labelPosition}
            isLabelHidden={typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined}
            disabledMessage={typeof disabledMessage === 'string' ? disabledMessage : undefined}
        />
    );
}
