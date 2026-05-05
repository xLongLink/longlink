import { Label } from '@/ui/label';
import { Slider } from '@/ui/slider';

type RangeProps = {
    label?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: number[] | string;
};


export function Range({ label, description, min = 0, max = 100, step = 1, value = [min, max] }: RangeProps) {
    const normalizedValue = (() => {
        if (typeof value === 'string' && value.trim()) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'number')) {
                    return parsed.length === 2 ? parsed : [parsed[0] ?? min, parsed[1] ?? max];
                }
            } catch {}
        }
        return value.length === 2 ? value : [value[0] ?? min, value[1] ?? max];
    })();
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
