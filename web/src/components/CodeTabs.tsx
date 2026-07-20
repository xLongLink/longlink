import { useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { CodeBlock } from '@/components/CodeBlock';

type CodeTabItem = {
    code: string;
    label: string;
    value: string;
    language?: string;
};

/** Renders connected tabs for switching between equivalent code snippets. */
export function CodeTabs({ defaultValue, items }: { defaultValue: string; items: CodeTabItem[] }) {
    const [value, setValue] = useState(defaultValue);
    const selectedItem = items.find((item) => item.value === value) ?? items[0];

    return (
        <Stack gap={2} width="100%">
            <TabList aria-label="Code examples" value={selectedItem?.value ?? defaultValue} onChange={setValue}>
                {items.map((item) => (
                    <Tab key={item.value} label={item.label} value={item.value} />
                ))}
            </TabList>
            {selectedItem ? (
                <CodeBlock language={selectedItem.language ?? 'bash'}>{selectedItem.code}</CodeBlock>
            ) : null}
        </Stack>
    );
}
