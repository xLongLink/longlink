import { Slider as AstryxSlider } from '@astryxdesign/core-0-3/Slider';
import type { Props } from '../types';
import { resolveInputStatus } from './input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { ORIENTATIONS, SLIDER_VALUE_DISPLAYS } from '../constants';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

/** Renders a single-value Astryx slider with numeric Valtio binding. */
export function Slider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => Number(value ?? 0));
    const orientationValue = resolveXml(props, 'orientation', ctx);
    const valueDisplayValue = resolveXml(props, 'valueDisplay', ctx);
    const orientation = isXmlEnum(orientationValue, ORIENTATIONS) ? orientationValue : 'horizontal';
    const valueDisplay = isXmlEnum(valueDisplayValue, SLIDER_VALUE_DISPLAYS) ? valueDisplayValue : 'tooltip';

    return (
        <AstryxSlider
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
            label={requireXmlString(props, 'label', ctx, 'Slider')}
            max={(() => {
                const value = resolveXml(props, 'max', ctx);
                return typeof value === 'number' ? value : 100;
            })()}
            min={(() => {
                const value = resolveXml(props, 'min', ctx);
                return typeof value === 'number' ? value : 0;
            })()}
            onChange={binding.setValue}
            orientation={orientation}
            status={resolveInputStatus(props, ctx)}
            step={(() => {
                const value = resolveXml(props, 'step', ctx);
                return typeof value === 'number' ? value : 1;
            })()}
            value={binding.value}
            valueDisplay={valueDisplay}
            width={(() => {
                const value = resolveXml(props, 'width', ctx);
                return typeof value === 'string' || typeof value === 'number' ? value : undefined;
            })()}
        />
    );
}
