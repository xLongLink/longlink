import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core-0-3/RadioList';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

/** Renders an Astryx radio list with a controlled XML value. */
export function RadioList({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const orientationValue = resolveXml(props, 'orientation', ctx);
    const sizeValue = resolveXml(props, 'size', ctx);
    const orientation = isXmlEnum(orientationValue, ['vertical', 'horizontal']) ? orientationValue : 'vertical';
    const size = isXmlEnum(sizeValue, ['sm', 'md']) ? sizeValue : 'md';

    return (
        <AstryxRadioList
            description={(() => { const value = resolveXml(props, 'description', ctx); return isXmlString(value) ? value : undefined; })()}
            disabledMessage={(() => { const value = resolveXml(props, 'disabledMessage', ctx); return isXmlString(value) ? value : undefined; })()}
            htmlName={(() => { const value = resolveXml(props, 'htmlName', ctx); return isXmlString(value) ? value : undefined; })()}
            isDisabled={(() => { const value = resolveXml(props, 'isDisabled', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isLabelHidden={(() => { const value = resolveXml(props, 'isLabelHidden', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isOptional={(() => { const value = resolveXml(props, 'isOptional', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isRequired={(() => { const value = resolveXml(props, 'isRequired', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            label={requireXmlString(props, 'label', ctx, 'RadioList')}
            onChange={binding.setValue}
            orientation={orientation}
            size={size}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={(() => { const value = resolveXml(props, 'width', ctx); return isXmlString(value) || isXmlNumber(value) ? value : undefined; })()}
        >
            {renderNode(nodes, ctx)}
        </AstryxRadioList>
    );
}

/** Renders one data-oriented Astryx radio option. */
export function RadioListItem({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return (
        <AstryxRadioListItem
            description={(() => { const value = resolveXml(props, 'description', ctx); return isXmlString(value) ? value : undefined; })()}
            isDisabled={(() => { const value = resolveXml(props, 'isDisabled', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            label={requireXmlString(props, 'label', ctx, 'RadioListItem')}
            value={requireXmlString(props, 'value', ctx, 'RadioListItem')}
        />
    );
}
