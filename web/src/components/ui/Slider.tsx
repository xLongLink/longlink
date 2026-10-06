import type { FieldProps } from './types';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';

type SliderProps = FieldProps & {
    min?: number;
    max?: number;
    step?: number;
    htmlName?: string;
} & (
        | { value: number; onChange?: (value: number) => void; onChangeEnd?: (value: number) => void }
        | {
              value: [number, number];
              onChange?: (value: [number, number]) => void;
              onChangeEnd?: (value: [number, number]) => void;
              minStepsBetweenThumbs?: number;
          }
    );

/** Edits a number or range using a standard horizontal slider. */
export function Slider(props: SliderProps) {
    // Use a percentage-scale slider unless the Solution supplies its own range.
    return (
        <AstryxSlider
            {...props}
            min={props.min ?? 0}
            max={props.max ?? 100}
            step={props.step ?? 1}
            isLabelHidden={false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
        />
    );
}
