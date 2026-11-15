import FormDocumentation from './form-documentation';
import { Slider } from '@/views/adapter/form/slider';

/** Shows a scalar slider with one native form value and associated feedback. */
export function SliderExample() {
    return (
        <Slider
            name="progress"
            label="Progress"
            description="Percentage complete."
            defaultValue={60}
            min={0}
            max={100}
            step={1}
        />
    );
}

/** Documents scalar and range values without exposing thumb composition. */
export default function SliderPage() {
    return (
        <FormDocumentation
            name="Slider"
            preview={<SliderExample />}
            code={`function Example() {
  return (
    <Slider
      name="progress"
      label="Progress"
      description="Percentage complete."
      defaultValue={60}
      min={0}
      max={100}
      step={1}
    />
  );
}`}
        />
    );
}
