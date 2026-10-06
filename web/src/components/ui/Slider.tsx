import { useValue } from './value';
import type { FieldProps } from './types';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';

type SliderProps = FieldProps & {
    min?: number;
    max?: number;
    step?: number;
    htmlName?: string;
} & (
        | {
              value?: number;
              defaultValue?: number;
              onChange?: (value: number) => void;
              onChangeEnd?: (value: number) => void;
          }
        | {
              value?: [number, number];
              defaultValue?: [number, number];
              onChange?: (value: [number, number]) => void;
              onChangeEnd?: (value: [number, number]) => void;
              minStepsBetweenThumbs?: number;
          }
    );

/** Edits a number or range using a standard horizontal slider. */
export function Slider(props: SliderProps) {
    // Slider carriers already preserve repeated names; local state only adapts uncontrolled editing.
    const field = useValue<number | [number, number]>(props.value, props.defaultValue ?? props.min ?? 0, (value) => {
        if (Array.isArray(props.value) || Array.isArray(props.defaultValue)) {
            if (Array.isArray(value)) (props.onChange as ((value: [number, number]) => void) | undefined)?.(value);
        } else if (typeof value === 'number') {
            (props.onChange as ((value: number) => void) | undefined)?.(value);
        }
    });

    // Use a percentage-scale slider unless the Solution supplies its own range.
    return (
        <AstryxSlider
            {...props}
            {...field}
            {...(Array.isArray(field.value)
                ? {
                      value: field.value,
                      onChange: (value: [number, number]) => field.onChange(value),
                      onChangeEnd: props.onChangeEnd as ((value: [number, number]) => void) | undefined,
                  }
                : {
                      value: field.value,
                      onChange: (value: number) => field.onChange(value),
                      onChangeEnd: props.onChangeEnd as ((value: number) => void) | undefined,
                  })}
            htmlName={props.name ?? props.htmlName}
            min={props.min ?? 0}
            max={props.max ?? 100}
            step={props.step ?? 1}
            isLabelHidden={false}
            isRequired={props.required ?? props.isRequired ?? false}
            isDisabled={props.disabled ?? props.isDisabled ?? false}
        />
    );
}
