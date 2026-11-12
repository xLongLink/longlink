import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Link } from '@/components/ui/Link';
import { Text } from '@/components/astryx/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@/components/astryx/Stack';

/** Documents Link in LongLink Views. */
export default function LinkPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Link"
            introduction={
                'Navigates within the Solution or opens an external HTTP(S) URL in a new tab. Omit to and provide onClick for a link-styled button, such as a document-preview action, with automatic async loading and duplicate-click prevention. Set download to a filename to save a scoped Solution attachment without navigating or showing a preview. An empty string uses attachment. Downloads retain scoped authentication and authorization; external URLs are not supported for downloads.'
            }
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
      <Dialog title="Document details" isOpen={isOpen} onOpenChange={setIsOpen}>
        <Stack padding={4}>
          <Text>Document details opened without navigation.</Text>
        </Stack>
      </Dialog>
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
            <Dialog title="Document details" isOpen={isOpen} onOpenChange={setIsOpen}>
                <Stack padding={4}>
                    <Text>Document details opened without navigation.</Text>
                </Stack>
            </Dialog>
        </Stack>
    );
}
