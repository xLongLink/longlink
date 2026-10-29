import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import { Stack } from '@astryxdesign/core/Stack';

/** Documents buttons and grouped button actions in LongLink Views. */
export default function ButtonsPage() {
    // Render both button contracts and the authored action example.
    return (
        <ViewLayout
            name="Button"
            isLongLinkSpecific
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Visible button text and accessible label.',
                },
                {
                    name: 'variant',
                    type: '"ghost" | "primary" | "secondary" | "destructive"',
                    description: 'Visual style variant.',
                },
                {
                    name: 'size',
                    type: '"sm" | "lg" | "md"',
                    description: 'Size variant.',
                },
                {
                    name: 'type',
                    type: '"button" | "submit" | "reset"',
                    description: 'HTML button type attribute.',
                },
                {
                    name: 'name',
                    type: 'string',
                    description: 'HTML name attribute for form submission.',
                },
                {
                    name: 'value',
                    type: 'string | number | readonly string[]',
                    description: 'HTML value attribute for form submission.',
                },
                {
                    name: 'form',
                    type: 'string',
                    description: 'Associates the button with a form element by ID.',
                },
                {
                    name: 'icon',
                    type: 'StoneIconName',
                    description: 'Icon displayed before the label.',
                },
                {
                    name: 'endContent',
                    type: 'ReactNode',
                    description: 'Content displayed after the label.',
                },
                {
                    name: 'width',
                    type: 'string | number',
                    description: 'Button width in pixels or CSS units.',
                },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables the button.',
                },
                {
                    name: 'href',
                    type: 'string',
                    description: 'Solution-relative destination or HTTP(S) URL to open in a new tab.',
                },
                {
                    name: 'onClick',
                    type: '(event: ViewMouseEvent) => void | Promise<void>',
                    description: 'Runs an action with automatic loading and duplicate-click prevention.',
                },
                {
                    type: 'ReactNode',
                    description: 'Button or IconButton children.',
                    name: 'ButtonGroup.children',
                },
                {
                    type: 'string',
                    description: 'Accessible label for the group (aria-label).',
                    name: 'ButtonGroup.label',
                },
                {
                    type: '"horizontal" | "vertical"',
                    description: 'Layout direction of the button group.',
                    name: 'ButtonGroup.orientation',
                },
                {
                    type: '"sm" | "lg" | "md"',
                    description: 'Default size for buttons in the group. Individual buttons can override.',
                    name: 'ButtonGroup.size',
                },
                {
                    type: 'boolean',
                    description: 'Whether all buttons in the group are disabled.',
                    name: 'ButtonGroup.isDisabled',
                },
            ]}
            introduction="Button triggers an action, submits a form, or opens a link. Buttons are flat. Use onClick for actions: loading feedback and duplicate-click prevention are automatic while an asynchronous handler is pending."
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
