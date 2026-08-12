import { Switch as AstryxSwitch } from '@astryxdesign/core-0-3/Switch';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    requireXmlString,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx switch with boolean Valtio binding. */
export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, toXmlBoolean);
    const labelPosition = resolveXmlEnum(props, 'labelPosition', ctx, ['start', 'end'], 'Switch') ?? 'end';
    const labelSpacing = resolveXmlEnum(props, 'labelSpacing', ctx, ['hug', 'spread'], 'Switch') ?? 'hug';

    return (
        <AstryxSwitch
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx)}
            label={requireXmlString(props, 'label', ctx, 'Switch')}
            labelPosition={labelPosition}
            labelSpacing={labelSpacing}
            onChange={binding.setValue}
            status={resolveXmlStatus(props, ctx)}
            value={binding.value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
