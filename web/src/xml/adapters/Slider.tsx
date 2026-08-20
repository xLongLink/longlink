import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';
import { requireXmlString, resolveXml } from '../core/props';

export function Slider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<number>(props, 'value', ctx, (value) => (typeof value === 'number' ? value : 0));
    const max = resolveXml(props, 'max', ctx);
    const min = resolveXml(props, 'min', ctx);
    const step = resolveXml(props, 'step', ctx);

    const commonProps = {
        label: requireXmlString(props, 'label', ctx, 'Slider'),
        max: typeof max === 'number' ? max : undefined,
        min: typeof min === 'number' ? min : undefined,
        step: typeof step === 'number' ? step : undefined,
    };

    return <AstryxSlider {...commonProps} onChange={binding.setValue} value={binding.value} />;
}
