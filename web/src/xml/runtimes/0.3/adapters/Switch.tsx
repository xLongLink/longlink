import { Switch as AstryxSwitch } from '@astryxdesign/core-0-3/Switch';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

/** Renders an Astryx switch with boolean Valtio binding. */
export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, toXmlBoolean);
    const labelPositionValue = resolveXml(props, 'labelPosition', ctx);
    const labelSpacingValue = resolveXml(props, 'labelSpacing', ctx);
    const labelPosition = isXmlEnum(labelPositionValue, ['start', 'end']) ? labelPositionValue : 'end';
    const labelSpacing = isXmlEnum(labelSpacingValue, ['hug', 'spread']) ? labelSpacingValue : 'hug';
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const width = resolveXml(props, 'width', ctx);

    return (
        <AstryxSwitch
            description={isXmlString(description) ? description : undefined}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            label={requireXmlString(props, 'label', ctx, 'Switch')}
            labelPosition={labelPosition}
            labelSpacing={labelSpacing}
            onChange={binding.setValue}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
        />
    );
}
