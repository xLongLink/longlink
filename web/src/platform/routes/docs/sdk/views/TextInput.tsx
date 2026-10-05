import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { TextInput } from '@/components/ui/TextInput';

/** Documents TextInput in LongLink Views. */
export default function TextInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TextInput"
            examples={[
                {
                    title: 'TextInput',
                    preview: <TextInputExample />,
                    code: `function Example() {
  const [value, setValue] = useState('');

  return (
    <TextInput label="Name" value={value} onChange={setValue} isRequired />
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps name edits local to this example. */
export function TextInputExample() {
    const [value, setValue] = useState('New order');

    // Retain the user's edits to the sample name.
    return <TextInput isLabelHidden label="Name" size="sm" value={value} width="100%" onChange={setValue} />;
}
