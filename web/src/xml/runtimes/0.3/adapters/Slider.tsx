import { Slider as AstryxSlider } from '@astryxdesign/core-0-3/Slider';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

/** Renders a single-value Astryx slider with numeric Valtio binding. */
export function Slider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => Number(value ?? 0));
    const orientationValue = resolveXml(props, 'orientation', ctx);
    const valueDisplayValue = resolveXml(props, 'valueDisplay', ctx);
    const orientation = isXmlEnum(orientationValue, ['horizontal', 'vertical']) ? orientationValue : 'horizontal';
    const valueDisplay = isXmlEnum(valueDisplayValue, ['tooltip', 'text', 'none']) ? valueDisplayValue : 'tooltip';

    return (
        <AstryxSlider
            description={(() => { const value = resolveXml(props, 'description', ctx); return isXmlString(value) ? value : undefined; })()}
            disabledMessage={(() => { const value = resolveXml(props, 'disabledMessage', ctx); return isXmlString(value) ? value : undefined; })()}
            htmlName={(() => { const value = resolveXml(props, 'htmlName', ctx); return isXmlString(value) ? value : undefined; })()}
            isDisabled={(() => { const value = resolveXml(props, 'isDisabled', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isLabelHidden={(() => { const value = resolveXml(props, 'isLabelHidden', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isOptional={(() => { const value = resolveXml(props, 'isOptional', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isRequired={(() => { const value = resolveXml(props, 'isRequired', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            label={requireXmlString(props, 'label', ctx, 'Slider')}
            max={(() => { const value = resolveXml(props, 'max', ctx); return isXmlNumber(value) ? value : 100; })()}
            min={(() => { const value = resolveXml(props, 'min', ctx); return isXmlNumber(value) ? value : 0; })()}
            onChange={binding.setValue}
            orientation={orientation}
            status={resolveInputStatus(props, ctx)}
            step={(() => { const value = resolveXml(props, 'step', ctx); return isXmlNumber(value) ? value : 1; })()}
            value={binding.value}
            valueDisplay={valueDisplay}
            width={(() => { const value = resolveXml(props, 'width', ctx); return isXmlString(value) || isXmlNumber(value) ? value : undefined; })()}
        />
    );
}
