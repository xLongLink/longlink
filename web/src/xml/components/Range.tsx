'use client';

import { Label } from '@/ui/label';
import { Slider } from '@/ui/slider';

type RangeProps = {
    label?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: number[];
};

/** Renders a range slider with two handles for min/max selection. */
export function Range({ label, description, min = 0, max = 100, step = 1, value = [min, max] }: RangeProps) {
    const normalizedValue = value.length === 2 ? value : [value[0] ?? min, value[1] ?? max];

    return (
        <div className="space-y-2">
            {(label || normalizedValue.length > 0) && (
                <div className="flex items-center justify-between gap-2">
                    {label ? <Label>{label}</Label> : <span />}
                    <span className="text-muted-foreground text-sm">{normalizedValue.join(', ')}</span>
                </div>
            )}

            <Slider value={normalizedValue} min={min} max={max} step={step} />

            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}

export default Range;
