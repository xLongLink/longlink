import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

/** Documents compact, keyboard-accessible selection between display modes. */
export default function SegmentedControlPage() {
    const [value, setValue] = useState('usage');

    return (
        <ViewLayout
            name="SegmentedControl"
            isLongLinkSpecific
            introduction="Selects one display mode with a compact pill-shaped radio group. Use Tabs for page panels, and SegmentedControl for chart or display options."
            properties={[
                { name: 'label', type: 'string', description: 'Required accessible group label.' },
                { name: 'value', type: 'string', description: 'Controlled selected option value.' },
                {
                    name: 'options',
                    type: 'readonly { value: string; label: string }[]',
                    description: 'Uniquely identified options with concise visible labels.',
                },
                {
                    name: 'onChange',
                    type: '(value: string) => void',
                    description: 'Receives pointer and keyboard selection changes.',
                },
            ]}
            example={{
                title: 'Leaderboard mode',
                preview: (
                    <SegmentedControl
                        label="Leaderboard mode"
                        value={value}
                        onChange={setValue}
                        options={[
                            { value: 'usage', label: 'Usage' },
                            { value: 'reviews', label: 'Reviews' },
                        ]}
                    />
                ),
                code: `/** Selects the leaderboard's display mode. */
function Example() {
  const [mode, setMode] = useState('usage');
  return <SegmentedControl label="Leaderboard mode" value={mode} onChange={setMode}
    options={[{ value: 'usage', label: 'Usage' }, { value: 'reviews', label: 'Reviews' }]} />;
}`,
            }}
        />
    );
}
