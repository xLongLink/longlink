import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import { Stack } from '@astryxdesign/core/Stack';
import references from '@/lib/generated/components.json';
import { ButtonGroup } from '@/components/ui/ButtonGroup';

// Preserve the narrower LongLink button contract rather than upstream-only props.
const upstream = references.find((reference) => reference.name === 'Button');
if (!upstream) throw new Error('Missing Button documentation reference');
const reference = {
    introduction:
        'Button triggers an action, submits a form, or opens a link. Buttons are flat. Use onClick for actions: loading feedback and duplicate-click prevention are automatic while an asynchronous handler is pending.',
    properties: upstream.properties
        .filter(
            (property) =>
                ![
                    'elevation',
                    'isLoading',
                    'isInterruptible',
                    'clickAction',
                    'as',
                    'children',
                    'isIconOnly',
                    'target',
                    'rel',
                ].includes(property.name)
        )
        .map((property) =>
            property.name === 'onClick'
                ? {
                      ...property,
                      type: '(event: ViewMouseEvent) => void | Promise<void>',
                      description:
                          'Runs when clicked. For asynchronous handlers, automatically shows loading feedback and prevents duplicate clicks until the returned promise settles.',
                  }
                : property.name === 'label'
                  ? { ...property, description: 'Visible button text and accessible label.' }
                  : property
        ),
    practices: upstream.practices.filter((practice) => !practice.description.includes('icon-only')),
};

// Keep the grouped button API available in the same reference page.
const buttonGroup = references.find((entry) => entry.name === 'ButtonGroup');
if (!buttonGroup) throw new Error('Missing ButtonGroup documentation reference');
const properties = [
    { name: 'Button', properties: reference.properties },
    { name: 'ButtonGroup', properties: buttonGroup.properties },
];

/** Documents buttons and grouped button actions in LongLink Views. */
export default function ButtonsPage() {
    // Render both button contracts and their authored action examples.
    return (
        <ViewLayout
            name="Button"
            reference={reference}
            properties={properties}
            examples={[
                {
                    title: 'Button',
                    preview: <ButtonExample />,
                    code: `function Example() {
  return (
    <Button
      label="Save"
      onClick={async () => {
        await request('/api/settings', {
          method: 'PATCH',
          json: { enabled: true },
        });
      }}
    />
  );
}`,
                },
                {
                    title: 'ButtonGroup',
                    preview: <ButtonGroupExample />,
                    code: `function Example() {
  return (
    <ButtonGroup label="Actions">
      <Button label="Save" />
      <Button label="Cancel" variant="ghost" />
    </ButtonGroup>
  );
}`,
                },
            ]}
        />
    );
}

/** Demonstrates button actions without calling a real API. */
export function ButtonExample() {
    const [action, setAction] = useState('');

    // Report sample actions locally instead of changing an order.
    return (
        <Stack gap={2}>
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                <Button label="Save" size="sm" variant="primary" onClick={() => setAction('Saved')} />
                <Button label="Edit" size="sm" onClick={() => setAction('Editing order')} />
                <Button label="View" size="sm" variant="ghost" onClick={() => setAction('Viewing order')} />
            </Stack>
            {action && <Text role="status">{action}</Text>}
        </Stack>
    );
}

/** Demonstrates grouped actions with local feedback. */
export function ButtonGroupExample() {
    const [action, setAction] = useState('');

    // Simulate editing actions without changing the clipboard.
    return (
        <Stack gap={2}>
            <ButtonGroup label="Text editing" size="sm">
                <Button label="Copy" onClick={() => setAction('Copied')} />
                <Button label="Cut" onClick={() => setAction('Cut')} />
                <Button label="Paste" onClick={() => setAction('Pasted')} />
            </ButtonGroup>
            {action && <Text role="status">{action}</Text>}
        </Stack>
    );
}
