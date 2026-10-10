import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { FormStep } from '@/components/ui/FormStep';
import { TextInput } from '@/components/ui/TextInput';

/** Documents persistent step fields and automatic Form navigation. */
export default function FormStepPage() {
    // Keep steps directly inside Form; each panel may contain ordinary layout components.
    return (
        <ViewLayout
            name="FormStep"
            introduction="Place FormStep directly inside Form to enable automatic progress and Next/Back controls. Next validates the current step and shared fields. Save validates every step and opens the first invalid one. Inactive fields remain mounted and enabled, preserving edits and complete submission data."
            examples={[
                {
                    title: 'Two-step form',
                    preview: (
                        <FormPreview stepped>
                            <FormStep label="Identity">
                                <TextInput name="name" label="Name" required />
                            </FormStep>
                            <FormStep label="Contact">
                                <TextInput name="email" label="Email" type="email" required />
                            </FormStep>
                        </FormPreview>
                    ),
                    code: `/** Creates a person using automatic step navigation. */
export default function CreatePerson() {
  return (
    <Form action="/api/people" submitLabel="Create person">
      <FormStep label="Identity">
        <TextInput name="name" label="Name" required />
      </FormStep>
      <FormStep label="Contact">
        <TextInput name="email" label="Email" type="email" required />
      </FormStep>
    </Form>
  );
}`,
                },
            ]}
        />
    );
}
