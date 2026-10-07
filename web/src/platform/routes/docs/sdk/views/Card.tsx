import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import ViewLayout, { type ViewReference } from './ViewLayout';

// Describe all three card behaviors using the shared public props.
const reference: ViewReference = {
    introduction:
        'Card has one shared set of props. onChange makes it selectable, onClick or href makes it clickable, and otherwise it is a plain content card. Selection takes priority when both kinds of interaction props are supplied.',
    practices: [
        {
            guidance: true,
            description:
                'Use plain cards for independent content, clickable cards for actions or navigation, and selectable cards for choices.',
        },
        {
            guidance: true,
            description:
                'Give interactive cards a descriptive label and keep selectable state in the parent component.',
        },
        {
            guidance: false,
            description: 'Use onClick to toggle selection, or mix navigation and selection on the same card.',
        },
    ],
};

/** Documents plain, clickable, and selectable cards. */
export default function CardPage() {
    // Render the card contract alongside each supported interaction mode.
    return (
        <ViewLayout
            name="Card"
            reference={reference}
            examples={[
                {
                    title: 'Plain card',
                    preview: (
                        <Card padding={3}>
                            <Text>Order details</Text>
                        </Card>
                    ),
                    code: `function Example() {
  return (
    <Card padding={3}>
      <Text>Order details</Text>
    </Card>
  );
}`,
                },
                {
                    title: 'Clickable card',
                    preview: <ClickableCardExample />,
                    code: `function Example() {
  return (
    <Card label="View order" href="/orders/123">
      <Text>View order</Text>
    </Card>
  );
}`,
                },
                {
                    title: 'Selectable card',
                    preview: <SelectableCardExample />,
                    code: `function Example() {
  const [selected, setSelected] = useState(false);

  return (
    <Card label="Team plan" isSelected={selected} onChange={setSelected}>
      <Text>Team plan</Text>
    </Card>
  );
}`,
                },
            ]}
        />
    );
}

/** Demonstrates a clickable card without navigating to a nonexistent order. */
function ClickableCardExample() {
    const [action, setAction] = useState('');

    // Keep action feedback local instead of changing the documentation route.
    return (
        <Stack gap={2}>
            <Card label="View order" onClick={() => setAction('Viewing order 123')}>
                <Text>View order</Text>
            </Card>
            {action && <Text role="status">{action}</Text>}
        </Stack>
    );
}

/** Keeps selectable-card state local to this example. */
function SelectableCardExample() {
    const [selected, setSelected] = useState(false);

    // Retain selection when the card is activated by pointer or keyboard.
    return (
        <Card label="Team plan" isSelected={selected} onChange={setSelected}>
            <Text>Team plan</Text>
        </Card>
    );
}
