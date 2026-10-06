import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { FileInput } from '@/components/ui/FileInput';

/** Documents FileInput in LongLink Views. */
export default function FileInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="FileInput"
            examples={[
                {
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
      <Stack gap={3}>
        <FileInput
          name="attachments"
          label="Attachments"
          accept=".pdf"
          multiple
          maxSize={512 * 1024}
          maxFiles={3}
          required
        />
        <Stack direction="horizontal" gap={2}>
          <Button type="submit" label="Submit" variant="primary" />
          <Button type="reset" label="Reset" />
        </Stack>
      </Stack>
    </Form>
  );
}`,
                },
            ]}
        />
    );
}

/** Shows themed multiple-file selection with local submission metadata. */
export function FileInputExample() {
    // Keep file objects intact; the preview displays filenames and sizes rather than uploading content.
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
