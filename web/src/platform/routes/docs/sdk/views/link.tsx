import { useState } from 'react';
import ViewLayout from './view-layout';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { Dialog } from '@/components/longlink/layout/dialog';

/** Documents Link in LongLink Views. */
export default function LinkPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Link"
            properties={[
                { name: 'href', type: 'string' },
                { name: 'preview', type: 'string' },
                { name: 'download', type: 'string' },
                { name: 'disabled', type: 'boolean' },
                { name: 'onClick', type: '(event: MouseEvent) => void | Promise<void>' },
                { name: 'children', type: 'ReactNode' },
                { name: '...props', type: 'Native anchor or button props' }
            ]}
            example={{
                title: 'Link',
                preview: <LinkExample />,
                code: `function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Stack>
      <Link href="/orders">Orders</Link>
      <Link href="/api/documents/sample" preview="sample-document.txt">
        sample-document.txt
      </Link>
      <Link href="/api/documents/sample" download="sample-document.txt">
        sample-document.txt
      </Link>
      <Link onClick={() => setIsOpen(true)}>Document details</Link>
      <Dialog title="Document details" open={isOpen} onOpenChange={setIsOpen}>
          <Text>Document details opened without navigation.</Text>
      </Dialog>
    </Stack>
  );
}`
            }}
        />
    );
}

/** Demonstrates navigation and a link-styled dialog action. */
export function LinkExample() {
    const [isOpen, setIsOpen] = useState(false);

    // Keep navigation separate from the action that opens the dialog.
    return (
        <Stack gap={0}>
            <Link href="/docs/sdk/views">Docs</Link>
            <Link onClick={() => setIsOpen(true)}>Document details</Link>
            <Dialog title="Document details" open={isOpen} onOpenChange={setIsOpen}>
                <span>Document details opened without navigation.</span>
            </Dialog>
        </Stack>
    );
}
