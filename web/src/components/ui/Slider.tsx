import { useValue } from './value';
import type { FieldProps } from './types';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';

type SliderProps = FieldProps & {
    min?: number;
    max?: number;
    step?: number;
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

/** Tuple-valued inputs select the range slider and its corresponding callbacks. */
function isRangeSlider(props: SliderProps): props is Extract<SliderProps, { value?: [number, number] }> {
    // Use the supplied value contract rather than inspecting callback signatures.
    return Array.isArray(props.value) || Array.isArray(props.defaultValue);
}

/** Edits a number or range using a standard horizontal slider. */
export function Slider(props: SliderProps) {
    // Slider carriers already preserve repeated names; local state only adapts uncontrolled editing.
    const { ref, value, onChange } = useValue<number | [number, number]>(
        props.value,
        props.defaultValue ?? props.min ?? 0,
        (value) => {
            if (isRangeSlider(props)) {
                if (Array.isArray(value)) props.onChange?.(value);
            } else if (!Array.isArray(value)) {
                props.onChange?.(value);
            }
        }
    );

    // Use a percentage-scale slider unless the Solution supplies its own range.
    return (
        <AstryxSlider
            {...props}
            width="100%"
            ref={ref}
            {...(Array.isArray(value)
                ? {
                      value,
                      onChange,
                      onChangeEnd: isRangeSlider(props) ? props.onChangeEnd : undefined,
                  }
                : {
                      value,
                      onChange,
                      onChangeEnd: !isRangeSlider(props) ? props.onChangeEnd : undefined,
                  })}
            htmlName={props.name}
            min={props.min ?? 0}
            max={props.max ?? 100}
            step={props.step ?? 1}
            isLabelHidden={false}
            isRequired={props.required ?? false}
            isDisabled={props.disabled ?? false}
        />
    );
}
