import ViewLayout from './ViewLayout';
import { FileInput } from '@/components/ui/FileInput';
import { useState, type ComponentProps } from 'react';

/** Documents FileInput in LongLink Views. */
export default function FileInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="FileInput"
            examples={[
                {
                    title: 'FileInput',
                    preview: <FileInputExample />,
                    code: `function Example() {
  const [value, setValue] = useState(null);

  return (
    <FileInput
      label="Attachment"
      value={value}
      onChange={setValue}
      accept=".pdf"
      maxSize={5 * 1024 * 1024}
    />
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps selected files local without uploading them. */
export function FileInputExample() {
    const [value, setValue] = useState<ComponentProps<typeof FileInput>['value']>(null);

    // Allow selecting and clearing a PDF attachment in the demo.
    return (
        <FileInput accept=".pdf" label="Attachment" placeholder="File" value={value} width="100%" onChange={setValue} />
    );
}
