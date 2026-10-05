import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { TextArea } from '@/components/ui/TextArea';

/** Documents TextArea in LongLink Views. */
export default function TextAreaPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TextArea"
            examples={[
                {
                    title: 'TextArea',
                    preview: <TextAreaExample />,
                    code: `function Example() {
  const [value, setValue] = useState('');

  return <TextArea label="Notes" value={value} onChange={setValue} rows={4} />;
}`,
                },
            ]}
        />
    );
}

/** Keeps note edits local to this example. */
export function TextAreaExample() {
    const [value, setValue] = useState('Review complete');

    // Retain the user's edits to the sample notes.
    return <TextArea isLabelHidden label="Notes" rows={2} value={value} onChange={setValue} />;
}
