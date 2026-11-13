import ViewLayout from './view-layout';
import { Button } from '@/components/shadcn/button';
import { IconButton } from '@/components/custom/icon-button';
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
                { name: 'IconButton.label', type: 'string', description: 'Accessible label for the icon-only button.' },
                { name: 'IconButton.icon', type: 'StoneIconName', description: 'Icon displayed inside the button.' },
                {
                    name: 'IconButton.variant',
                    type: '"default" | "outline" | "secondary" | "ghost" | "destructive" | "link"',
                    description: 'Visual style variant.'
                },
                { name: 'IconButton.size', type: '"xs" | "sm" | "default" | "lg"', description: 'Icon button size.' },
                { name: 'IconButton.isDisabled', type: 'boolean', description: 'Disables the icon button.' },
                {
                    name: 'IconButton.onClick',
                    type: '(event: ViewMouseEvent) => void | Promise<void>',
                    description: 'Runs an action with automatic loading and duplicate-click prevention.'
                },
                {
                    type: 'ReactNode',
                    description: 'ActionButton or IconButton children for coordinated keyboard navigation.',
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
        <IconButton icon="plus" label="Add" />
        <IconButton icon="edit" label="Edit" variant="outline" />
        <IconButton icon="copy" label="Copy" variant="secondary" />
        <IconButton icon="close" label="Close" variant="ghost" />
        <IconButton icon="delete" label="Delete" variant="destructive" />
        <IconButton icon="link" label="Link" variant="link" />
        <IconButton icon="plus" label="Add (disabled)" isDisabled />
      </Stack>
      <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
        <IconButton icon="plus" label="Add (extra small)" size="xs" />
        <IconButton icon="plus" label="Add (small)" size="sm" />
        <IconButton icon="plus" label="Add (default)" />
        <IconButton icon="plus" label="Add (large)" size="lg" />
      </Stack>
      <Stack direction="horizontal" gap={4} align="center" wrap="wrap">
        <ActionButtonGroup label="Actions">
           <ActionButton variant="outline">Save</ActionButton>
           <ActionButton variant="outline">Cancel</ActionButton>
          <IconButton icon="plus" label="Add" variant="outline" />
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
                <IconButton icon="plus" label="Add" />
                <IconButton icon="edit" label="Edit" variant="outline" />
                <IconButton icon="copy" label="Copy" variant="secondary" />
                <IconButton icon="close" label="Close" variant="ghost" />
                <IconButton icon="delete" label="Delete" variant="destructive" />
                <IconButton icon="link" label="Link" variant="link" />
                <IconButton icon="plus" label="Add (disabled)" isDisabled />
            </Stack>
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                <IconButton icon="plus" label="Add (extra small)" size="xs" />
                <IconButton icon="plus" label="Add (small)" size="sm" />
                <IconButton icon="plus" label="Add (default)" />
                <IconButton icon="plus" label="Add (large)" size="lg" />
            </Stack>
            <Stack direction="horizontal" gap={4} align="center" wrap="wrap">
                <ActionButtonGroup label="Actions">
                    <ActionButton variant="outline">Save</ActionButton>
                    <ActionButton variant="outline">Cancel</ActionButton>
                    <IconButton icon="plus" label="Add" variant="outline" />
                </ActionButtonGroup>
                <ActionButtonGroup label="Vertical actions" orientation="vertical">
                    <ActionButton variant="outline">Edit</ActionButton>
                    <ActionButton variant="outline">Duplicate</ActionButton>
                </ActionButtonGroup>
            </Stack>
        </Stack>
    );
}
