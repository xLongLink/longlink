import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core-0-3/RadioList';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { resolveInputStatus } from './input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { COMPACT_SIZES, ORIENTATIONS } from '../constants';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

/**
 * https://astryx.atmeta.com/components/RadioList?tab=properties
 * - label: string
 * - description: string
 * - disabledMessage: string
 * - htmlName: string
 * - value: string
 * - orientation: str
 * - size: str
 * - isDisabled: bool
 * - isLabelHidden: bool
 * - isOptional: bool
 * - isRequired: bool
 * - width: str | int
 * - status: str
 * - statusMessage: string
 * - children: RadioListItem
 */
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

/**
 * https://astryx.atmeta.com/components/RadioListItem?tab=properties
 * - label: string
 * - value: string
 * - description: string
 * - isDisabled: bool
 */
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
