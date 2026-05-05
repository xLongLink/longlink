import { Label } from '@/ui/label';
import { Slider as UISlider } from '@/ui/slider';

type SliderValue = number | number[];
type SliderProps = {
    label?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: SliderValue;
    orientation?: 'horizontal' | 'vertical';
    disabled?: boolean;
};

function toNumber(value: number | string | undefined, fallback: number): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

function normalizeValue(value: SliderValue | string | undefined, min: number, max: number) {
    if (Array.isArray(value)) return value.length > 0 ? value : [min, max];
    if (typeof value === 'number') return [value];
    if (typeof value === 'string' && value.trim() !== '') {
        if (value.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'number')) return parsed;
            } catch {}
        }
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return [parsed];
    }
    return [min, max];
}

export function Slider({
    label,
    description,
    min = 0,
    max = 100,
    step = 1,
    value,
    orientation = 'horizontal',
    disabled = false,
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
                    void nextValue;
                }}
            />
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}
