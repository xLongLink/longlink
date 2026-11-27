/* oxlint-disable react/no-array-index-key -- Thumb identity must survive changes to its value. */
import { FieldFrame } from './field';
import type * as fields from './fields';
import type { ComponentProps } from 'react';
import * as slider from '@/components/shadcn/slider';
import type { Slider as SliderPrimitive } from '@base-ui/react/slider';

/** Builds one thumb per value and associates every thumb with field feedback. */
export function Slider<Value extends number | readonly number[] = number>({
    label,
    description,
    error,
    min = 0,
    value,
    defaultValue,
    ref,
    onBlur,
    onFocus,
    ...props
}: fields.FieldProps &
    Omit<
        SliderPrimitive.Root.Props<Value>,
        'children' | 'className' | 'style' | 'render' | 'ref' | 'onBlur' | 'onFocus'
    > &
    Pick<ComponentProps<typeof slider.SliderThumb>, 'onBlur' | 'onFocus'> & {
        ref?: ComponentProps<typeof slider.SliderThumb>['inputRef'];
    }) {
    const values = value ?? defaultValue ?? min;
    const thumbs = Array.isArray(values) ? values : [values];

    return (
        <FieldFrame field={{ ...props, label, description, error }} disabled={props.disabled} form={props.form} group>
            {(field) => (
                <slider.Slider<Value>
                    {...props}
                    {...field}
                    min={min}
                    value={value}
                    defaultValue={defaultValue}
                    className={undefined}
                    style={undefined}
                    render={undefined}
                >
                    <slider.SliderControl>
                        <slider.SliderTrack>
                            <slider.SliderRange />
                        </slider.SliderTrack>
                        {thumbs.map((_, index) => (
                            <slider.SliderThumb
                                key={`${field.id}-${index}`}
                                index={index}
                                inputRef={index === 0 ? ref : undefined}
                                onBlur={onBlur}
                                onFocus={onFocus}
                                aria-label={
                                    thumbs.length > 1
                                        ? `${props['aria-label'] ?? label ?? 'Value'} ${index + 1}`
                                        : field['aria-label']
                                }
                                aria-labelledby={thumbs.length > 1 ? undefined : field['aria-labelledby']}
                                aria-describedby={field['aria-describedby']}
                                aria-invalid={field['aria-invalid']}
                            />
                        ))}
                    </slider.SliderControl>
                </slider.Slider>
            )}
        </FieldFrame>
    );
}
