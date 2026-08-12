import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core-0-3/RadioList';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import {
    requireXmlString,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx radio list with a controlled XML value. */
export function RadioList({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const orientation = resolveXmlEnum(props, 'orientation', ctx, ['vertical', 'horizontal'], 'RadioList') ?? 'vertical';
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md'], 'RadioList') ?? 'md';

    return (
        <AstryxRadioList
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx)}
            label={requireXmlString(props, 'label', ctx, 'RadioList')}
            onChange={binding.setValue}
            orientation={orientation}
            size={size}
            status={resolveXmlStatus(props, ctx)}
            value={binding.value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
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
            description={resolveXmlString(props, 'description', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx)}
            label={requireXmlString(props, 'label', ctx, 'RadioListItem')}
            value={requireXmlString(props, 'value', ctx, 'RadioListItem')}
        />
    );
}
