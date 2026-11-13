import { useId } from 'react';
import type { FieldProps } from '../ui/types';
import type { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { FieldContent, FieldDescription, FieldTitle } from '@/components/shadcn/field';
import { Slider, SliderControl, SliderTrack, SliderRange, SliderThumb } from '@/components/shadcn/slider';

/** Adds field labeling to the native slider without replacing its interaction or form behavior. */
export function SliderField<Value extends number | readonly number[]>({
    label,
    description,
    required,
    children,
    defaultValue,
    value,
    min = 0,
    ...props
}: FieldProps & SliderPrimitive.Root.Props<Value>) {
    // Label every thumb through the native root while allowing caller-authored composition.
    const id = useId();
    const values = value ?? defaultValue;
    const count = Array.isArray(values) ? values.length : 1;

    return (
        <div
            className="flex min-w-0 flex-col gap-1"
            role="group"
            aria-labelledby={`${id}-label`}
            aria-describedby={description ? `${id}-description` : undefined}
        >
            <FieldContent>
                <FieldTitle id={`${id}-label`}>
                    {label}
                    {required && (
                        <span className="text-muted-foreground font-normal">
                            <span aria-hidden="true"> · </span>Required
                        </span>
                    )}
                </FieldTitle>
                {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
            </FieldContent>
            <Slider
                aria-labelledby={`${id}-label`}
                aria-describedby={description ? `${id}-description` : undefined}
                defaultValue={defaultValue}
                value={value}
                min={min}
                {...props}
            >
                {children ?? (
                    <SliderControl>
                        <SliderTrack>
                            <SliderRange />
                        </SliderTrack>
                        {Array.from({ length: count }, (_, index) => (
                            <SliderThumb
                                key={index}
                                index={index}
                                aria-describedby={description ? `${id}-description` : undefined}
                            />
                        ))}
                    </SliderControl>
                )}
            </Slider>
        </div>
    );
}
