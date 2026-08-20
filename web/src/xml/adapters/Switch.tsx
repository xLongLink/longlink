import type { Props } from '../types';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { COMPACT_SIZES, SWITCH_LABEL_POSITIONS } from '../constants';

export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => value !== 'false' && Boolean(value));
    const size = resolveXml(props, 'size', ctx);
    const width = resolveXml(props, 'width', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const description = resolveXml(props, 'description', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const labelPosition = resolveXml(props, 'labelPosition', ctx);

    if (!isXmlEnum(labelPosition, [undefined, ...SWITCH_LABEL_POSITIONS])) {
        throw new Error(`Unsupported Switch labelPosition '${String(labelPosition)}'`);
    }

    if (!isXmlEnum(size, [undefined, ...COMPACT_SIZES])) {
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
            description={typeof description === 'string' ? description : undefined}
            labelTooltip={typeof labelTooltip === 'string' ? labelTooltip : undefined}
            labelPosition={labelPosition}
        />
    );
}
