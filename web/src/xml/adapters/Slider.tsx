import { Slider as UISlider } from '@/components/ui/slider';
import { getVersion, useSnapshot } from 'valtio';
import { useXmlContext } from '../core/context';
import type { Props } from '../types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** Props accepted by the XML Slider component. */

/** Renders a shadcn-backed slider with optional reactive state binding. */
export function Slider({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = resolveXmlValue(props, 'defaultValue', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const max = resolveXmlString(props, 'max', ctx);
    const min = resolveXmlString(props, 'min', ctx);
    const name = resolveXmlString(props, 'name', ctx);
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');
    const step = resolveXmlString(props, 'step', ctx);
    const value = resolveXmlValue(props, 'value', ctx);
    const numericMin = Number(min);
    const numericMax = Number(max);
    const numericStep = Number(step);
    const resolvedMin = Number.isFinite(numericMin) ? numericMin : 0;
    const resolvedMax = Number.isFinite(numericMax) ? numericMax : 100;
    const resolvedStep = Number.isFinite(numericStep) ? numericStep : 1;
    const fallbackValue = Number.isFinite(resolvedMin) ? [resolvedMin] : [0];

    // Keep the slider controlled when it is bound to a Valtio-backed XML state slot.
    if (value && typeof value === 'object' && getVersion(value) !== undefined) {
        const state = value as Record<string, unknown> & { value?: unknown };
        const snapshot = useSnapshot(state);
        const currentValue = 'value' in snapshot ? snapshot.value : snapshot;
        const normalizedValue = Array.isArray(currentValue)
            ? currentValue.map((item) => Number(item))
            : currentValue == null
              ? fallbackValue
              : [Number(currentValue)];

        return (
            <UISlider
                disabled={disabled}
                id={id}
                max={resolvedMax}
                min={resolvedMin}
                name={name}
                orientation={orientation}
                step={resolvedStep}
                value={normalizedValue}
                onValueChange={(nextValue) => {
                    const nextValues = Array.isArray(nextValue) ? nextValue : [nextValue];

                    if (Array.isArray(state)) {
                        state.splice(0, state.length, ...nextValues);
                    } else if ('value' in state) {
                        state.value = nextValues.length <= 1 ? (nextValues[0] ?? resolvedMin) : nextValues;
                    }
                }}
            />
        );
    }

    // Use the XML value as the initial slider position when it is not bound to state.
    const initialValue = Array.isArray(value)
        ? value.map((item) => Number(item))
        : value != null
          ? [Number(value)]
          : Array.isArray(defaultValue)
            ? defaultValue.map((item) => Number(item))
            : defaultValue != null
              ? [Number(defaultValue)]
              : fallbackValue;

    return (
        <UISlider
            defaultValue={initialValue}
            disabled={disabled}
            id={id}
            max={resolvedMax}
            min={resolvedMin}
            name={name}
            orientation={orientation}
            step={resolvedStep}
        />
    );
}
