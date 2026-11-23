import ViewLayout from './view-layout';
import { Icon, Stack, Button, ButtonGroup, ButtonGroupText, ButtonGroupSeparator } from '@/components/longlink';

/** Documents buttons and grouped button actions in LongLink Views. */
export default function ButtonsPage() {
    // Keep regular, icon-only, and grouped buttons in one reference.
    return (
        <ViewLayout
            name="Button"
            relatedComponents={['ButtonGroup']}
            example={{
                title: 'Button',
                preview: <ButtonExample />,
                code: `function Example() {
  return (
    <Stack gap={4}>
      <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
        <Button variant="primary">Primary</Button>
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
        <Button size="icon" aria-label="Add"><Icon icon="plus" size="md" /></Button>
        <Button size="icon" aria-label="Edit" variant="outline"><Icon icon="edit" size="md" /></Button>
        <Button size="icon" aria-label="Copy" variant="secondary"><Icon icon="copy" size="md" /></Button>
        <Button size="icon" aria-label="Close" variant="ghost"><Icon icon="x" size="md" /></Button>
        <Button size="icon" aria-label="Delete" variant="destructive"><Icon icon="delete" size="md" /></Button>
        <Button size="icon" aria-label="Link" variant="link"><Icon icon="link" size="md" /></Button>
        <Button size="icon" aria-label="Add (disabled)" disabled><Icon icon="plus" size="md" /></Button>
      </Stack>
      <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
        <Button size="icon-xs" aria-label="Add (extra small)"><Icon icon="plus" size="md" /></Button>
        <Button size="icon-sm" aria-label="Add (small)"><Icon icon="plus" size="sm" /></Button>
        <Button size="icon" aria-label="Add (default)"><Icon icon="plus" size="md" /></Button>
        <Button size="icon-lg" aria-label="Add (large)"><Icon icon="plus" size="lg" /></Button>
      </Stack>
      <Stack direction="horizontal" gap={4} align="center" wrap="wrap">
        <ButtonGroup aria-label="Actions">
          <ButtonGroupText>Changes</ButtonGroupText>
          <Button variant="outline">Save</Button>
          <ButtonGroupSeparator />
          <Button variant="outline">Cancel</Button>
          <Button size="icon" aria-label="Add" variant="outline"><Icon icon="plus" size="md" /></Button>
        </ButtonGroup>
        <ButtonGroup aria-label="Vertical actions" orientation="vertical">
          <Button variant="outline">Edit</Button>
          <Button variant="outline">Duplicate</Button>
        </ButtonGroup>
      </Stack>
    </Stack>
  );
}`
            }}
        />
    );
}

/** Showcases button variants, sizes, disabled states, and grouping. */
function ButtonExample() {
    // Wrap each row so all variants remain reachable on narrow screens.
    return (
        <Stack gap={4}>
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                <Button variant="primary">Primary</Button>
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
                <Button size="icon" aria-label="Add">
                    <Icon icon="plus" size="md" />
                </Button>
                <Button size="icon" aria-label="Edit" variant="outline">
                    <Icon icon="edit" size="md" />
                </Button>
                <Button size="icon" aria-label="Copy" variant="secondary">
                    <Icon icon="copy" size="md" />
                </Button>
                <Button size="icon" aria-label="Close" variant="ghost">
                    <Icon icon="x" size="md" />
                </Button>
                <Button size="icon" aria-label="Delete" variant="destructive">
                    <Icon icon="delete" size="md" />
                </Button>
                <Button size="icon" aria-label="Link" variant="link">
                    <Icon icon="link" size="md" />
                </Button>
                <Button size="icon" aria-label="Add (disabled)" disabled>
                    <Icon icon="plus" size="md" />
                </Button>
            </Stack>
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                <Button size="icon-xs" aria-label="Add (extra small)">
                    <Icon icon="plus" size="md" />
                </Button>
                <Button size="icon-sm" aria-label="Add (small)">
                    <Icon icon="plus" size="sm" />
                </Button>
                <Button size="icon" aria-label="Add (default)">
                    <Icon icon="plus" size="md" />
                </Button>
                <Button size="icon-lg" aria-label="Add (large)">
                    <Icon icon="plus" size="lg" />
                </Button>
            </Stack>
            <Stack direction="horizontal" gap={4} align="center" wrap="wrap">
                <ButtonGroup aria-label="Actions">
                    <ButtonGroupText>Changes</ButtonGroupText>
                    <Button variant="outline">Save</Button>
                    <ButtonGroupSeparator />
                    <Button variant="outline">Cancel</Button>
                    <Button size="icon" aria-label="Add" variant="outline">
                        <Icon icon="plus" size="md" />
                    </Button>
                </ButtonGroup>
                <ButtonGroup aria-label="Vertical actions" orientation="vertical">
                    <Button variant="outline">Edit</Button>
                    <Button variant="outline">Duplicate</Button>
                </ButtonGroup>
            </Stack>
        </Stack>
    );
}
