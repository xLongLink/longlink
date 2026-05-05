import { Label } from '@/ui/label';
import { Slider } from '@/ui/slider';
import type { XmlComponentProps } from '@/xml';
import { evaluate, resolveBinding, useContext } from '@/xml';

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
    const { ctx, setters } = useContext();
    const label = String(evaluate(rawProps.label ?? '', ctx) ?? '');
    const description = String(evaluate(rawProps.description ?? '', ctx) ?? '');
    const min = Number(evaluate(rawProps.min ?? '', ctx) ?? 0);
    const max = Number(evaluate(rawProps.max ?? '', ctx) ?? 100);
    const step = Number(evaluate(rawProps.step ?? '', ctx) ?? 1);
    const resolvedMin = Number.isFinite(min) ? min : 0;
    const resolvedMax = Number.isFinite(max) ? max : 100;
    const resolvedStep = Number.isFinite(step) ? step : 1;

    /* Resolve value binding for two-way data sync */
    const valueProp = rawProps.value ?? '';
    let value: unknown = evaluate(valueProp, ctx);
    let onChange: ((value: number[]) => void) | undefined;
    if (valueProp.startsWith('$')) {
        try {
            const binding = resolveBinding(valueProp.slice(1), ctx, setters ?? {});
            value = binding.value;
            onChange = binding.setValue as (value: number[]) => void;
        } catch {
            // Use evaluated value if binding fails
        }
    }

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
