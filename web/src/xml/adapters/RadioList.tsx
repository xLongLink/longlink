import type { Props } from '../types';
import { renderNode } from '../core/node';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { COMPACT_SIZES, ORIENTATIONS } from '../constants';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';

export function RadioList({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const orientationValue = resolveXml(props, 'orientation', ctx);
    const sizeValue = resolveXml(props, 'size', ctx);
    const orientation = isXmlEnum(orientationValue, ORIENTATIONS) ? orientationValue : 'vertical';
    const size = isXmlEnum(sizeValue, COMPACT_SIZES) ? sizeValue : 'md';
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const width = resolveXml(props, 'width', ctx);

    return (
        <AstryxRadioList
            description={typeof description === 'string' ? description : undefined}
            disabledMessage={typeof disabledMessage === 'string' ? disabledMessage : undefined}
            htmlName={typeof htmlName === 'string' ? htmlName : undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isLabelHidden={typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined}
            isOptional={typeof isOptional === 'boolean' ? isOptional : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            label={requireXmlString(props, 'label', ctx, 'RadioList')}
            labelTooltip={typeof labelTooltip === 'string' ? labelTooltip : undefined}
            onChange={binding.setValue}
            orientation={orientation}
            size={size}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxRadioList>
    );
}

export function RadioListItem({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const description = resolveXml(props, 'description', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);

    return (
        <AstryxRadioListItem
            description={typeof description === 'string' ? description : undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            label={requireXmlString(props, 'label', ctx, 'RadioListItem')}
            value={requireXmlString(props, 'value', ctx, 'RadioListItem')}
        />
    );
}
