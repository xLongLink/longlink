import { Label } from '@/ui/label';
import { Slider } from '@/ui/slider';
import type { XmlComponentProps } from '@/xml';
import { useProps } from '@/xml';

type RangeProps = {
    label?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: number[] | string;
    onChange?: (value: number[]) => void;
};

/** Renders an XML range control from evaluated XML props. */
export function Range({ props: rawProps }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    const { label, description, min = 0, max = 100, step = 1, value = [min, max], onChange } = props as RangeProps;
    const resolvedMin = typeof min === 'number' && Number.isFinite(min) ? min : 0;
    const resolvedMax = typeof max === 'number' && Number.isFinite(max) ? max : 100;
    const resolvedStep = typeof step === 'number' && Number.isFinite(step) ? step : 1;
    const normalizedValue = (() => {
        if (typeof value === 'string' && value.trim()) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'number')) {
                    return parsed.length === 2 ? parsed : [parsed[0] ?? resolvedMin, parsed[1] ?? resolvedMax];
                }
            } catch {
                return [resolvedMin, resolvedMax];
            }
        }
        return Array.isArray(value)
            ? value.length === 2
                ? value
                : [value[0] ?? resolvedMin, value[1] ?? resolvedMax]
            : [resolvedMin, resolvedMax];
    })();
    return (
        <div className="space-y-2">
            {(label || normalizedValue.length > 0) && (
                <div className="flex items-center justify-between gap-2">
                    {label ? <Label>{label}</Label> : <span />}
                    <span className="text-muted-foreground text-sm">{normalizedValue.join(', ')}</span>
                </div>
            )}
            <Slider
                value={normalizedValue}
                min={resolvedMin}
                max={resolvedMax}
                step={resolvedStep}
                onValueChange={(nextValue) => onChange?.(Array.isArray(nextValue) ? [...nextValue] : [nextValue])}
            />
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}
