import { Switch as AstryxSwitch } from '@astryxdesign/core-0-3/Switch';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';
import { resolveInputStatus } from './input';

/** Renders an Astryx switch with boolean Valtio binding. */
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

    if (labelPosition != null && labelPosition !== 'start' && labelPosition !== 'end') {
        throw new Error(`Unsupported Switch labelPosition '${String(labelPosition)}'`);
    }

    if (labelSpacing != null && labelSpacing !== 'hug' && labelSpacing !== 'spread') {
        throw new Error(`Unsupported Switch labelSpacing '${String(labelSpacing)}'`);
    }

    if (size != null && size !== 'sm' && size !== 'md') {
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
