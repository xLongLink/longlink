import { Switch as AstryxSwitch } from '@astryxdesign/core-0-3/Switch';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

const SWITCH_LABEL_POSITIONS = ['start', 'end'] as const;
const SWITCH_LABEL_SPACINGS = ['hug', 'spread'] as const;
const SWITCH_SIZES = ['sm', 'md'] as const;

/** Renders an Astryx switch with boolean Valtio binding. */
export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, toXmlBoolean);
    const size = resolveXml(props, 'size', ctx);
    const width = resolveXml(props, 'width', ctx);
    const labelPosition = resolveXml(props, 'labelPosition', ctx);
    const labelSpacing = resolveXml(props, 'labelSpacing', ctx);
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);

    if (labelPosition != null && !isXmlEnum(labelPosition, SWITCH_LABEL_POSITIONS)) throw new Error(`Unsupported Switch labelPosition '${String(labelPosition)}'`);
    if (labelSpacing != null && !isXmlEnum(labelSpacing, SWITCH_LABEL_SPACINGS)) throw new Error(`Unsupported Switch labelSpacing '${String(labelSpacing)}'`);
    if (size != null && !isXmlEnum(size, SWITCH_SIZES)) throw new Error(`Unsupported Switch size '${String(size)}'`);

    return (
        <AstryxSwitch
            description={isXmlString(description) ? description : undefined}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            isLoading={isXmlBoolean(isLoading) ? isLoading : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            label={requireXmlString(props, 'label', ctx, 'Switch')}
            labelTooltip={isXmlString(labelTooltip) ? labelTooltip : undefined}
            labelPosition={labelPosition}
            labelSpacing={labelSpacing}
            onChange={binding.setValue}
            status={resolveInputStatus(props, ctx)}
            size={size}
            value={binding.value}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
        />
    );
}
