import type { Props } from '../types';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';
import { requireXmlString, resolveXml } from '../core/props';

export function Slider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<number>(props, 'value', ctx, (value) => (typeof value === 'number' ? value : 0));
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const width = resolveXml(props, 'width', ctx);

    const description = resolveXml(props, 'description', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const max = resolveXml(props, 'max', ctx);
    const min = resolveXml(props, 'min', ctx);
    const step = resolveXml(props, 'step', ctx);

    const commonProps = {
        description: typeof description === 'string' ? description : undefined,
        htmlName: typeof htmlName === 'string' ? htmlName : undefined,
        label: requireXmlString(props, 'label', ctx, 'Slider'),
        labelTooltip: typeof labelTooltip === 'string' ? labelTooltip : undefined,
        max: typeof max === 'number' ? max : undefined,
        min: typeof min === 'number' ? min : undefined,
        status: resolveInputStatus(props, ctx),
        step: typeof step === 'number' ? step : undefined,
        width: typeof width === 'string' || typeof width === 'number' ? width : undefined,
    };

    return <AstryxSlider {...commonProps} onChange={binding.setValue} value={binding.value} />;
}
