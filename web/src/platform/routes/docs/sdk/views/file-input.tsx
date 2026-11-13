import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { FileInput } from '@/components/custom/file-input';

/** Documents FileInput in LongLink Views. */
export default function FileInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="FileInput"
            properties={[
                { name: 'label', type: 'string', description: 'Accessible label for the file input.' },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Description text displayed between the label and input.'
                },
                {
                    name: 'name',
                    type: 'string',
                    description: "Includes the themed control's value under this form submission name."
                },
                { name: 'required', type: 'boolean', description: 'Requires a value before native form submission.' },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Prevents interaction and excludes the field from submission.'
                },
                {
                    name: 'value',
                    type: 'File | File[] | null',
                    description: 'Currently selected file(s). Controlled component.'
                },
                {
                    name: 'onChange',
                    type: '(value: File | File[] | null) => void',
                    description: 'Callback fired when files are selected or removed.'
                },
                {
                    name: 'accept',
                    type: 'string',
                    description:
                        'Accepted file types. Uses the HTML accept attribute format (e.g. "image/*", ".pdf,.doc").'
                },
                { name: 'multiple', type: 'boolean', description: 'Allows selecting multiple files.' },
                {
                    name: 'maxSize',
                    type: 'number',
                    description: 'Maximum file size in bytes. Files exceeding this are rejected with an error status.'
                },
                {
                    name: 'maxFiles',
                    type: 'number',
                    description: 'Maximum file count when multiple selection is enabled.'
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Placeholder text shown when no file is selected.'
                },
                { name: 'mode', type: '"input" | "dropzone"', description: 'Compact input or drag-and-drop area.' }
            ]}
            example={{
                title: 'Attachments form',
                preview: (
                    <FormPreview>
                        <FileInputExample />
                    </FormPreview>
                ),
                code: `/** Submits multiple attachments with their original filenames. */
export default function AttachmentsForm() {
  return (
    <Form action="/api/example" method="post">
      <FileInput
        name="attachments"
        label="Attachments"
        accept=".pdf"
        multiple
        maxSize={512 * 1024}
        maxFiles={3}
        required
      />
    </Form>
  );
}`
            }}
        />
    );
}

/** Shows themed multiple-file selection. */
export function FileInputExample() {
    // Keep file selection local rather than uploading content.
    return (
        <FileInput
            name="attachments"
            label="Attachments"
            accept=".pdf"
            multiple
            maxSize={512 * 1024}
            maxFiles={3}
            required
        />
    );
}
