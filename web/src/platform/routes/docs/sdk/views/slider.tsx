import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { SliderField } from '@/components/custom/slider-field';

/** Documents Slider in LongLink Views. */
export default function SliderPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Slider"
            properties={[
                { name: 'SliderField.label', type: 'string', description: 'SliderField label text.' },
                {
                    name: 'SliderField.description',
                    type: 'string',
                    description: 'SliderField description rendered below the label.'
                },
                {
                    name: 'name',
                    type: 'string',
                    description: "Includes the themed control's value under this form submission name."
                },
                {
                    name: 'SliderField.required',
                    type: 'boolean',
                    description: 'Marks the SliderField label as required; sliders always have a value.'
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
        <SliderField label="Progress" value={field.value} onChange={field.onChange} min={0} max={100} step={1} />
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
    // Delegate editing and named form inputs to the native slider.
    return <SliderField name="progress" label="Progress" defaultValue={60} min={0} max={100} step={1} />;
}
