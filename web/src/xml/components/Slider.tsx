import { Label } from '@/ui/label';
import { Slider as UISlider } from '@/ui/slider';
import type { ComponentProps } from 'react';

type SliderValue = number | number[];

type SliderProps = ComponentProps<typeof UISlider> & {
    label?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: SliderValue;
    orientation?: 'horizontal' | 'vertical';
    disabled?: boolean;
};

function normalizeValue(value: SliderValue | undefined, min: number, max: number) {
    if (Array.isArray(value)) {
        return value.length > 0 ? value : [min, max];
    }

    if (typeof value === 'number') {
        return [value];
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
    orientation = 'horizontal',
    disabled = false,
    ...props
}: SliderProps) {
    const normalizedValue = normalizeValue(value, min, max);

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
                min={min}
                max={max}
                step={step}
                orientation={orientation}
                disabled={disabled}
                {...props}
            />

            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}

export default Slider;
