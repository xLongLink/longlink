import { Label } from '@/ui/label';
import { Slider as UISlider } from '@/ui/slider';

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

export function Slider({
    label,
    description,
    min = 0,
    max = 100,
    step = 1,
    value,
    onChange,
    orientation = 'horizontal',
    disabled = false,
}: SliderProps) {
    const normalizedMin = typeof min === 'number' && Number.isFinite(min) ? min : 0;
    const normalizedMax = typeof max === 'number' && Number.isFinite(max) ? max : 100;
    const normalizedStep = typeof step === 'number' && Number.isFinite(step) ? step : 1;
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
