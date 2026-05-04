import { Label } from '@/ui/label';
import { Slider as UISlider } from '@/ui/slider';
import type { ComponentProps } from 'react';

type SliderValue = number | number[];

type SliderProps = Omit<ComponentProps<typeof UISlider>, 'max' | 'min' | 'onValueChange' | 'step' | 'value'> & {
    label?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: SliderValue;
    onValueChange?: (value: SliderValue) => void;
    orientation?: 'horizontal' | 'vertical';
    disabled?: boolean;
};

/** Coerces XML numeric attributes into numbers before passing them to the UI slider. */
function toNumber(value: number | string | undefined, fallback: number): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);

        return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
}

/** Normalizes single and range slider values into the array shape used by Radix. */
function normalizeValue(value: SliderValue | string | undefined, min: number, max: number) {
    if (Array.isArray(value)) {
        return value.length > 0 ? value : [min, max];
    }

    if (typeof value === 'number') {
        return [value];
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
            return [parsed];
        }
    }

    return [min, max];
}

/** Renders a slider input with label, description, and value display. */
export function Slider({
    label,
    description,
    min = 0,
    max = 100,
    step = 1,
    value,
    onValueChange,
    orientation = 'horizontal',
    disabled = false,
    ...props
}: SliderProps) {
    const normalizedMin = toNumber(min, 0);
    const normalizedMax = toNumber(max, 100);
    const normalizedStep = toNumber(step, 1);
    const normalizedValue = normalizeValue(value, normalizedMin, normalizedMax);

    return (
        <div className="space-y-2">
            {(label || normalizedValue.length > 0) && (
                <div className="flex items-center justify-between gap-2">
                    {label ? <Label>{label}</Label> : <span />}
                    <span className="text-muted-foreground text-sm">{normalizedValue.join(', ')}</span>
                </div>
            )}

            <UISlider
                value={normalizedValue}
                min={normalizedMin}
                max={normalizedMax}
                step={normalizedStep}
                orientation={orientation}
                disabled={disabled}
                onValueChange={(nextValue) => {
                    /* Preserve scalar state for single-value sliders while supporting range arrays. */
                    if (typeof nextValue === 'number') {
                        onValueChange?.(nextValue);
                        return;
                    }

                    onValueChange?.(nextValue.length === 1 ? nextValue[0]! : [...nextValue]);
                }}
                {...props}
            />

            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}

export default Slider;
