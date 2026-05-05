import { Label } from '@/ui/label';
import { Slider as UISlider } from '@/ui/slider';
import type { XmlComponentProps } from '@/xml';
import { evaluate, resolveBinding, useContext } from '@/xml';

type SliderValue = number | readonly number[] | string;
type SliderProps = {
    label?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: SliderValue;
    onChange?: (value: SliderValue) => void;
    orientation?: 'horizontal' | 'vertical';
    disabled?: boolean;
};

/** Renders an XML slider control from evaluated XML props. */
export function Slider({ props: rawProps }: XmlComponentProps) {
    const { ctx, setters } = useContext();
    const label = String(evaluate(rawProps.label ?? '', ctx) ?? '');
    const description = String(evaluate(rawProps.description ?? '', ctx) ?? '');
    const min = Number(evaluate(rawProps.min ?? '', ctx) ?? 0);
    const max = Number(evaluate(rawProps.max ?? '', ctx) ?? 100);
    const step = Number(evaluate(rawProps.step ?? '', ctx) ?? 1);
    const orientation = String(evaluate(rawProps.orientation ?? '', ctx) ?? 'horizontal') as 'horizontal' | 'vertical';
    const disabled = Boolean(evaluate(rawProps.disabled ?? '', ctx) ?? false);

    /* Resolve value binding for two-way data sync */
    const valueProp = rawProps.value ?? '';
    let value: unknown = evaluate(valueProp, ctx);
    let onChange: ((value: SliderValue) => void) | undefined;
    if (valueProp.startsWith('$')) {
        try {
            const binding = resolveBinding(valueProp.slice(1), ctx, setters ?? {});
            value = binding.value;
            onChange = binding.setValue as (value: SliderValue) => void;
        } catch {
            // Use evaluated value if binding fails
        }
    }

    const normalizedMin = Number.isFinite(min) ? min : 0;
    const normalizedMax = Number.isFinite(max) ? max : 100;
    const normalizedStep = Number.isFinite(step) ? step : 1;

    const normalizedValue = Array.isArray(value)
        ? value.length > 0
            ? value
            : [normalizedMin, normalizedMax]
        : typeof value === 'number'
          ? [value]
          : typeof value === 'string' && value.trim() !== ''
            ? (() => {
                  if (value.trim().startsWith('[')) {
                      try {
                          const parsed = JSON.parse(value);
                          if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'number')) {
                              return parsed;
                          }
                      } catch {}
                  }
                  const parsed = Number(value);
                  return Number.isFinite(parsed) ? [parsed] : [normalizedMin, normalizedMax];
              })()
            : [normalizedMin, normalizedMax];
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
                    onChange?.(Array.isArray(nextValue) ? [...nextValue] : nextValue);
                }}
            />
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}
