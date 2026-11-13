import { useId } from 'react';
import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';

/** Documents the shadcn radio group composition in LongLink Views. */
export default function RadioGroupPage() {
    // Keep the preview and published example on the native component API.
    return (
        <ViewLayout
            name="RadioGroup"
            properties={[
                { name: 'name', type: 'string', description: 'Form submission name.' },
                { name: 'value', type: 'string', description: 'Controlled selected value.' },
                { name: 'defaultValue', type: 'string', description: 'Initial uncontrolled selected value.' },
                {
                    name: 'onValueChange',
                    type: '(value: string, eventDetails) => void',
                    description: 'Called with the next selected value and Base UI event details.'
                },
                { name: 'required', type: 'boolean', description: 'Requires a selection before form submission.' },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables all options, including keyboard focus and form submission.'
                },
                { name: 'RadioGroupItem.value', type: 'string', description: 'Value submitted for this option.' },
                { name: 'RadioGroupItem.id', type: 'string', description: 'Connects the option to its label.' },
                { name: 'RadioGroupItem.disabled', type: 'boolean', description: 'Disables this option.' }
            ]}
            example={{
                title: 'Plan form',
                preview: (
                    <FormPreview>
                        <RadioGroupExample />
                    </FormPreview>
                ),
                code: `/** Submits one plan using shadcn radio controls. */
export default function PlanForm() {
  return (
    <Form action="/api/example" method="post">
      <RadioGroup className="mx-auto w-fit" name="plan" defaultValue="team" aria-label="Plan" required>
        <Field orientation="horizontal">
          <RadioGroupItem id="plan-solo" value="solo" />
          <FieldLabel htmlFor="plan-solo">Solo</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem id="plan-team" value="team" />
          <FieldLabel htmlFor="plan-team">Team</FieldLabel>
        </Field>
      </RadioGroup>
    </Form>
  );
}`
            }}
        />
    );
}

/** Shows the default vertical shadcn radio group with associated labels. */
export function RadioGroupExample() {
    const id = useId();

    // Keep label associations unique across catalog and documentation previews.
    return (
        <RadioGroup className="mx-auto w-fit" name="plan" defaultValue="team" aria-label="Plan" required>
            <Field orientation="horizontal">
                <RadioGroupItem id={`${id}-solo`} value="solo" />
                <FieldLabel htmlFor={`${id}-solo`}>Solo</FieldLabel>
            </Field>
            <Field orientation="horizontal">
                <RadioGroupItem id={`${id}-team`} value="team" />
                <FieldLabel htmlFor={`${id}-team`}>Team</FieldLabel>
            </Field>
        </RadioGroup>
    );
}
