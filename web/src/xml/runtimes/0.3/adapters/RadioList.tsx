import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core-0-3/RadioList';
import { COMPACT_SIZES, ORIENTATIONS } from '../constants';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';
import { resolveInputStatus } from './input';

/** Renders an Astryx radio list with a controlled XML value. */
export function RadioList({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const orientationValue = resolveXml(props, 'orientation', ctx);
    const sizeValue = resolveXml(props, 'size', ctx);
    const orientation = isXmlEnum(orientationValue, ORIENTATIONS) ? orientationValue : 'vertical';
    const size = isXmlEnum(sizeValue, COMPACT_SIZES) ? sizeValue : 'md';

    return (
        <AstryxRadioList
            description={(() => {
                const value = resolveXml(props, 'description', ctx);
                return typeof value === 'string' ? value : undefined;
            })()}
            disabledMessage={(() => {
                const value = resolveXml(props, 'disabledMessage', ctx);
                return typeof value === 'string' ? value : undefined;
            })()}
            htmlName={(() => {
                const value = resolveXml(props, 'htmlName', ctx);
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
            isOptional={(() => {
                const value = resolveXml(props, 'isOptional', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            isRequired={(() => {
                const value = resolveXml(props, 'isRequired', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            label={requireXmlString(props, 'label', ctx, 'RadioList')}
            onChange={binding.setValue}
            orientation={orientation}
            size={size}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={(() => {
                const value = resolveXml(props, 'width', ctx);
                return typeof value === 'string' || typeof value === 'number' ? value : undefined;
            })()}
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
            description={(() => {
                const value = resolveXml(props, 'description', ctx);
                return typeof value === 'string' ? value : undefined;
            })()}
            isDisabled={(() => {
                const value = resolveXml(props, 'isDisabled', ctx);
                return typeof value === 'boolean' ? value : undefined;
            })()}
            label={requireXmlString(props, 'label', ctx, 'RadioListItem')}
            value={requireXmlString(props, 'value', ctx, 'RadioListItem')}
        />
    );
}
