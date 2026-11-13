import ViewLayout from './ViewLayout';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { NativeStack as Stack } from '@/components/ui/NativeStack';

/** Documents buttons and grouped button actions in LongLink Views. */
export default function ButtonsPage() {
    // Keep regular, icon-only, and grouped buttons in one reference.
    return (
        <ViewLayout
            name="Button"
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Button text and optional icons.',
                },
                {
                    name: 'variant',
                    type: '"default" | "outline" | "secondary" | "ghost" | "destructive" | "link"',
                    description: 'Visual style variant.',
                },
                {
                    name: 'size',
                    type: '"xs" | "sm" | "default" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"',
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
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables the button.',
                },
                {
                    name: 'focusableWhenDisabled',
                    type: 'boolean',
                    description: 'Defaults to true in LongLink; false removes disabled buttons from keyboard focus.',
                },
                {
                    name: 'href',
                    type: 'string',
                    description: 'Solution-relative destination or HTTP(S) URL to open in a new tab.',
                },
                {
                    name: 'onClick',
                    type: '(event: ViewMouseEvent) => void | Promise<void>',
                    description:
                        'Unlike shadcn Button, awaits async handlers with loading feedback and duplicate-activation protection.',
                },
                {
                    name: 'IconButton.label',
                    type: 'string',
                    description: 'Accessible label for the icon-only button.',
                },
                {
                    name: 'IconButton.icon',
                    type: 'StoneIconName',
                    description: 'Icon displayed inside the button.',
                },
                {
                    name: 'IconButton.variant',
                    type: '"default" | "outline" | "secondary" | "ghost" | "destructive" | "link"',
                    description: 'Visual style variant.',
                },
                {
                    name: 'IconButton.size',
                    type: '"xs" | "sm" | "default" | "lg"',
                    description: 'Icon button size.',
                },
                {
                    name: 'IconButton.isDisabled',
                    type: 'boolean',
                    description: 'Disables the icon button.',
                },
                {
                    name: 'IconButton.onClick',
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
                    type: '"sm" | "lg" | "default"',
                    description: 'Default size for buttons in the group. Individual buttons can override.',
                    name: 'ButtonGroup.size',
                },
                {
                    type: 'boolean',
                    description: 'Whether all buttons in the group are disabled.',
                    name: 'ButtonGroup.isDisabled',
                },
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
        <ButtonGroup label="Actions">
          <Button variant="outline">Save</Button>
          <Button variant="outline">Cancel</Button>
          <IconButton icon="plus" label="Add" variant="outline" />
        </ButtonGroup>
        <ButtonGroup label="Vertical actions" orientation="vertical">
          <Button variant="outline">Edit</Button>
          <Button variant="outline">Duplicate</Button>
        </ButtonGroup>
      </Stack>
    </Stack>
  );
}`,
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
                <ButtonGroup label="Actions">
                    <Button variant="outline">Save</Button>
                    <Button variant="outline">Cancel</Button>
                    <IconButton icon="plus" label="Add" variant="outline" />
                </ButtonGroup>
                <ButtonGroup label="Vertical actions" orientation="vertical">
                    <Button variant="outline">Edit</Button>
                    <Button variant="outline">Duplicate</Button>
                </ButtonGroup>
            </Stack>
        </Stack>
    );
}
