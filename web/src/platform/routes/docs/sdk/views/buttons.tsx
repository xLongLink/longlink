import ViewLayout from './view-layout';
import { Icon } from '@/components/custom/icon';
import { Button } from '@/components/shadcn/button';
import { ButtonGroup } from '@/components/shadcn/button-group';
import { ActionButton } from '@/components/custom/action-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { ActionButtonGroup } from '@/components/custom/action-button-group';

/** Documents buttons and grouped button actions in LongLink Views. */
export default function ButtonsPage() {
    // Keep regular, icon-only, and grouped buttons in one reference.
    return (
        <ViewLayout
            name="Button"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Button text and optional icons.' },
                {
                    name: 'variant',
                    type: '"default" | "outline" | "secondary" | "ghost" | "destructive" | "link"',
                    description: 'Visual style variant.'
                },
                {
                    name: 'size',
                    type: '"xs" | "sm" | "default" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"',
                    description: 'Size variant.'
                },
                { name: 'type', type: '"button" | "submit" | "reset"', description: 'HTML button type attribute.' },
                { name: 'name', type: 'string', description: 'HTML name attribute for form submission.' },
                {
                    name: 'value',
                    type: 'string | number | readonly string[]',
                    description: 'HTML value attribute for form submission.'
                },
                { name: 'form', type: 'string', description: 'Associates the button with a form element by ID.' },
                { name: 'disabled', type: 'boolean', description: 'Disables the button.' },
                {
                    name: 'focusableWhenDisabled',
                    type: 'boolean',
                    description: 'Allows disabled buttons to remain focusable when explicitly enabled.'
                },
                {
                    name: 'ActionButton.href',
                    type: 'string',
                    description: 'Scoped destination for the custom asynchronous action button.'
                },
                {
                    name: 'onClick',
                    type: '(event: React.MouseEvent<HTMLButtonElement>) => void',
                    description: 'Native shadcn button event handler.'
                },
                {
                    name: 'ActionButton.onClick',
                    type: '(event) => void | Promise<void>',
                    description:
                        'Custom adapter that awaits actions with loading feedback and duplicate-activation protection.'
                },
                { name: 'aria-label', type: 'string', description: 'Accessible name for an icon-only button.' },
                {
                    name: 'ButtonGroup.orientation',
                    type: '"horizontal" | "vertical"',
                    description: 'Connected button layout.'
                },
                { name: 'ButtonGroup.aria-label', type: 'string', description: 'Accessible group label.' },
                {
                    name: 'ButtonGroup.children',
                    type: 'ReactNode',
                    description: 'Native Button or composed control children.'
                },
                {
                    type: 'ReactNode',
                    description: 'ActionButton children for coordinated keyboard navigation.',
                    name: 'ActionButtonGroup.children'
                },
                {
                    type: 'string',
                    description: 'Accessible label for the group (aria-label).',
                    name: 'ActionButtonGroup.label'
                },
                {
                    type: '"horizontal" | "vertical"',
                    description: 'Layout direction of the button group.',
                    name: 'ActionButtonGroup.orientation'
                },
                {
                    type: '"sm" | "lg" | "default"',
                    description: 'Default size for buttons in the group. Individual buttons can override.',
                    name: 'ActionButtonGroup.size'
                },
                {
                    type: 'boolean',
                    description: 'Whether all buttons in the group are disabled.',
                    name: 'ActionButtonGroup.isDisabled'
                }
            ]}
            example={{
                title: 'Button',
                preview: <ButtonExample />,
                code: `function Example() {
  return (
    <Stack gap={4}>
      <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button disabled>Disabled</Button>
      </Stack>
      <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
      </Stack>
      <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
        <ActionButton size="icon" aria-label="Add"><Icon icon="plus" size="md" /></ActionButton>
        <ActionButton size="icon" aria-label="Edit" variant="outline"><Icon icon="edit" size="md" /></ActionButton>
        <ActionButton size="icon" aria-label="Copy" variant="secondary"><Icon icon="copy" size="md" /></ActionButton>
        <ActionButton size="icon" aria-label="Close" variant="ghost"><Icon icon="close" size="md" /></ActionButton>
        <ActionButton size="icon" aria-label="Delete" variant="destructive"><Icon icon="delete" size="md" /></ActionButton>
        <ActionButton size="icon" aria-label="Link" variant="link"><Icon icon="link" size="md" /></ActionButton>
        <ActionButton size="icon" aria-label="Add (disabled)" disabled><Icon icon="plus" size="md" /></ActionButton>
      </Stack>
      <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
        <ActionButton size="icon-xs" aria-label="Add (extra small)"><Icon icon="plus" size="md" /></ActionButton>
        <ActionButton size="icon-sm" aria-label="Add (small)"><Icon icon="plus" size="sm" /></ActionButton>
        <ActionButton size="icon" aria-label="Add (default)"><Icon icon="plus" size="md" /></ActionButton>
        <ActionButton size="icon-lg" aria-label="Add (large)"><Icon icon="plus" size="lg" /></ActionButton>
      </Stack>
      <Stack direction="horizontal" gap={4} align="center" wrap="wrap">
        <ButtonGroup aria-label="Native actions">
          <Button variant="outline">Save</Button>
          <Button variant="outline">Cancel</Button>
        </ButtonGroup>
        <ActionButtonGroup label="Actions">
          <ActionButton variant="outline">Save</ActionButton>
          <ActionButton variant="outline">Cancel</ActionButton>
          <ActionButton size="icon" aria-label="Add" variant="outline"><Icon icon="plus" size="md" /></ActionButton>
        </ActionButtonGroup>
        <ActionButtonGroup label="Vertical actions" orientation="vertical">
          <ActionButton variant="outline">Edit</ActionButton>
          <ActionButton variant="outline">Duplicate</ActionButton>
        </ActionButtonGroup>
      </Stack>
    </Stack>
  );
}`
            }}
        />
    );
}

/** Showcases button variants, sizes, disabled states, and grouping. */
export function ButtonExample() {
    // Wrap each row so all variants remain reachable on narrow screens.
    return (
        <Stack gap={4}>
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                <Button>Default</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
                <Button disabled>Disabled</Button>
            </Stack>
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                <Button size="xs">Extra small</Button>
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
            </Stack>
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                <ActionButton size="icon" aria-label="Add">
                    <Icon icon="plus" size="md" />
                </ActionButton>
                <ActionButton size="icon" aria-label="Edit" variant="outline">
                    <Icon icon="edit" size="md" />
                </ActionButton>
                <ActionButton size="icon" aria-label="Copy" variant="secondary">
                    <Icon icon="copy" size="md" />
                </ActionButton>
                <ActionButton size="icon" aria-label="Close" variant="ghost">
                    <Icon icon="close" size="md" />
                </ActionButton>
                <ActionButton size="icon" aria-label="Delete" variant="destructive">
                    <Icon icon="delete" size="md" />
                </ActionButton>
                <ActionButton size="icon" aria-label="Link" variant="link">
                    <Icon icon="link" size="md" />
                </ActionButton>
                <ActionButton size="icon" aria-label="Add (disabled)" disabled>
                    <Icon icon="plus" size="md" />
                </ActionButton>
            </Stack>
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                <ActionButton size="icon-xs" aria-label="Add (extra small)">
                    <Icon icon="plus" size="md" />
                </ActionButton>
                <ActionButton size="icon-sm" aria-label="Add (small)">
                    <Icon icon="plus" size="sm" />
                </ActionButton>
                <ActionButton size="icon" aria-label="Add (default)">
                    <Icon icon="plus" size="md" />
                </ActionButton>
                <ActionButton size="icon-lg" aria-label="Add (large)">
                    <Icon icon="plus" size="lg" />
                </ActionButton>
            </Stack>
            <Stack direction="horizontal" gap={4} align="center" wrap="wrap">
                <ButtonGroup aria-label="Native actions">
                    <Button variant="outline">Save</Button>
                    <Button variant="outline">Cancel</Button>
                </ButtonGroup>
                <ActionButtonGroup label="Actions">
                    <ActionButton variant="outline">Save</ActionButton>
                    <ActionButton variant="outline">Cancel</ActionButton>
                    <ActionButton size="icon" aria-label="Add" variant="outline">
                        <Icon icon="plus" size="md" />
                    </ActionButton>
                </ActionButtonGroup>
                <ActionButtonGroup label="Vertical actions" orientation="vertical">
                    <ActionButton variant="outline">Edit</ActionButton>
                    <ActionButton variant="outline">Duplicate</ActionButton>
                </ActionButtonGroup>
            </Stack>
        </Stack>
    );
}
