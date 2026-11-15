import { useId } from 'react';
import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { Field, FieldContent, FieldDescription, FieldTitle } from '@/components/shadcn/field';
import { Slider, SliderControl, SliderTrack, SliderRange, SliderThumb } from '@/components/shadcn/slider';

/** Documents Slider in LongLink Views. */
export default function SliderPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Slider"
            properties={[
                {
                    name: 'aria-labelledby',
                    type: 'string',
                    description: 'ID of the FieldTitle that labels the slider.'
                },
                {
                    name: 'aria-describedby',
                    type: 'string',
                    description: 'ID of the FieldDescription that describes the slider.'
                },
                {
                    name: 'name',
                    type: 'string',
                    description: "Includes the themed control's value under this form submission name."
                },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Prevents interaction and excludes the field from submission.'
                },
                { name: 'min', type: 'number', description: 'Minimum value.' },
                { name: 'max', type: 'number', description: 'Maximum value.' },
                { name: 'step', type: 'number', description: 'Step increment.' },
                {
                    name: 'value',
                    type: 'number | readonly number[]',
                    description: 'Current value: a number for one thumb or a readonly number array for multiple thumbs.'
                },
                { name: 'defaultValue', type: 'number | readonly number[]', description: 'Initial value.' },
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Compose SliderControl, SliderTrack, SliderRange, and one SliderThumb per value.'
                },
                {
                    name: 'onValueChange',
                    type: '(value, eventDetails) => void',
                    description: 'Native callback fired when the value changes.'
                },
                {
                    name: 'onValueCommitted',
                    type: '(value, eventDetails) => void',
                    description: 'Native callback fired when an interaction commits a value.'
                },
                {
                    name: 'minStepsBetweenValues',
                    type: 'number',
                    description:
                        'Minimum number of steps between thumbs in range mode; prevents thumbs from overlapping.'
                }
            ]}
            example={{
                title: 'Progress form',
                preview: (
                    <FormPreview>
                        <SliderExample />
                    </FormPreview>
                ),
                code: `/** Submits progress managed by React Hook Form. */
export default function ProgressForm() {
  const id = useId();
  const form = useForm({ defaultValues: { progress: 60 } });
  const submit = useSubmit("/api/example", {
    onError: () => form.setError("root", { message: "Could not save. Please try again." })
  });

  async function save(values) {
    const data = new FormData();
    data.append("progress", String(values.progress));
    await submit(data);
  }

  return (
    <form onSubmit={form.handleSubmit(save)}>
      <Controller name="progress" control={form.control} render={({ field }) => (
        <Field>
          <FieldContent>
            <FieldTitle id={id + "-label"}>Progress</FieldTitle>
            <FieldDescription id={id + "-description"}>Percentage complete.</FieldDescription>
          </FieldContent>
          <Slider name={field.name} value={field.value} onValueChange={field.onChange}
            aria-labelledby={id + "-label"} aria-describedby={id + "-description"}
            min={0} max={100} step={1}>
            <SliderControl>
              <SliderTrack><SliderRange /></SliderTrack>
              <SliderThumb index={0} ref={field.ref} onBlur={field.onBlur}
                aria-describedby={id + "-description"} />
            </SliderControl>
          </Slider>
        </Field>
      )} />
      <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
      <FieldError errors={[form.formState.errors.root]} />
    </form>
  );
}`
            }}
        />
    );
}

/** Shows a named slider whose value is included in native form data. */
export function SliderExample() {
    // Associate this scalar slider's label and description without adding form inputs.
    const id = useId();

    return (
        <Field>
            <FieldContent>
                <FieldTitle id={`${id}-label`}>Progress</FieldTitle>
                <FieldDescription id={`${id}-description`}>Percentage complete.</FieldDescription>
            </FieldContent>
            <Slider
                name="progress"
                aria-labelledby={`${id}-label`}
                aria-describedby={`${id}-description`}
                defaultValue={60}
                min={0}
                max={100}
                step={1}
            >
                <SliderControl>
                    <SliderTrack>
                        <SliderRange />
                    </SliderTrack>
                    <SliderThumb index={0} aria-describedby={`${id}-description`} />
                </SliderControl>
            </Slider>
        </Field>
    );
}
