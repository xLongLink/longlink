import { useId } from 'react';
import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { Textarea } from '@/components/shadcn/textarea';
import { Field, FieldLabel } from '@/components/shadcn/field';

/** Documents the shadcn textarea in LongLink Views. */
export default function TextareaPage() {
    // Show native textarea props and DOM events without a custom form adapter.
    return (
        <ViewLayout
            name="Textarea"
            properties={[
                { name: 'name', type: 'string', description: 'Form submission name.' },
                { name: 'value', type: 'string', description: 'Controlled value.' },
                { name: 'defaultValue', type: 'string', description: 'Initial uncontrolled value.' },
                {
                    name: 'onChange',
                    type: 'ChangeEventHandler<HTMLTextAreaElement>',
                    description: 'DOM change event; read event.currentTarget.value.'
                },
                { name: 'placeholder', type: 'string', description: 'Hint shown while empty.' },
                { name: 'rows', type: 'number', description: 'Number of visible text rows.' },
                { name: 'required', type: 'boolean', description: 'Requires a value before native form submission.' },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables editing, keyboard focus, and form submission.'
                },
                {
                    name: 'readOnly',
                    type: 'boolean',
                    description: 'Prevents edits while retaining focus and submission.'
                },
                { name: 'maxLength', type: 'number', description: 'Native maximum length in UTF-16 code units.' },
                { name: 'autoComplete', type: 'string', description: 'Native autocomplete hint.' }
            ]}
            example={{
                title: 'Notes form',
                preview: (
                    <FormPreview>
                        <TextareaExample />
                    </FormPreview>
                ),
                code: `/** Submits multi-line notes using shadcn's textarea. */
export default function NotesForm() {
  return (
    <Form action="/api/example" method="post">
      <Field>
        <FieldLabel htmlFor="notes">Notes</FieldLabel>
        <Textarea id="notes" name="notes" placeholder="Enter notes" />
      </Field>
    </Form>
  );
}`
            }}
        />
    );
}

/** Shows the default textarea with an associated label. */
export function TextareaExample() {
    const id = useId();

    // Keep label associations unique across documentation and catalog previews.
    return (
        <Field>
            <FieldLabel htmlFor={id}>Notes</FieldLabel>
            <Textarea id={id} name="notes" placeholder="Enter notes" />
        </Field>
    );
}
