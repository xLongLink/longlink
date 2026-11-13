import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Link } from '@/components/ui/Link';
import { ViewDialog } from '@/components/ui/ViewDialog';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';

/** Documents Link in LongLink Views. */
export default function LinkPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Link"
            properties={[
                {
                    name: 'to',
                    type: 'string',
                    description: 'Optional link destination. Omit for a link-styled button action.',
                },
                {
                    name: 'download',
                    type: 'string',
                    description: 'Download filename for a scoped Solution attachment instead of navigation.',
                },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables navigation, downloads, and actions.',
                },
                {
                    name: 'onClick',
                    type: '(event: ViewMouseEvent) => void | Promise<void>',
                    description: 'Runs an action with automatic async loading and duplicate-click prevention.',
                },
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Link content',
                },
            ]}
            example={{
                title: 'Link',
                preview: <LinkExample />,
                code: `function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Stack>
      <Link to="/orders">Orders</Link>
      <Link to="/api/documents/sample" download="sample-document.txt">
        sample-document.txt
      </Link>
      <Link onClick={() => setIsOpen(true)}>Document details</Link>
      <ViewDialog title="Document details" isOpen={isOpen} onOpenChange={setIsOpen}>
        <Stack padding={4}>
          <Text>Document details opened without navigation.</Text>
        </Stack>
      </ViewDialog>
    </Stack>
  );
}`,
            }}
        />
    );
}

/** Demonstrates navigation and a link-styled dialog action. */
export function LinkExample() {
    const [isOpen, setIsOpen] = useState(false);

    // Keep navigation separate from the action that opens the dialog.
    return (
        <Stack>
            <Link to="/docs/sdk/views">Docs</Link>
            <Link onClick={() => setIsOpen(true)}>Document details</Link>
            <ViewDialog title="Document details" isOpen={isOpen} onOpenChange={setIsOpen}>
                <Stack padding={4}>
                    <Text>Document details opened without navigation.</Text>
                </Stack>
            </ViewDialog>
        </Stack>
    );
}
