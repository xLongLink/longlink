import { useState } from 'react';
import ViewLayout from './view-layout';
import { Link } from '@/components/longlink/action/link';
import { Dialog } from '@/components/longlink/layout/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';

/** Documents Link in LongLink Views. */
export default function LinkPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Link"
            properties={[
                {
                    name: 'href',
                    type: 'string',
                    description: 'Navigation or file destination. Omit for an onClick-only action.'
                },
                {
                    name: 'preview',
                    type: 'string',
                    description: 'Open a scoped Solution file in a preview dialog using this filename as its title.'
                },
                {
                    name: 'download',
                    type: 'string',
                    description: 'Download filename for a scoped Solution attachment instead of navigation.'
                },
                { name: 'disabled', type: 'boolean', description: 'Disables navigation or the action.' },
                {
                    name: 'onClick',
                    type: '(event: MouseEvent) => void | Promise<void>',
                    description:
                        'Runs a callback. Actions track async loading; preventDefault cancels navigation or file handling.'
                },
                { name: 'children', type: 'ReactNode', description: 'Caller-owned link content.' },
                {
                    name: '...props',
                    type: 'Native anchor or button props',
                    description:
                        'Navigation forwards anchor props and ref. File and callback actions forward button props and ref.'
                }
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
        <Stack>
            <Link href="/docs/sdk/views">Docs</Link>
            <Link onClick={() => setIsOpen(true)}>Document details</Link>
            <Dialog title="Document details" open={isOpen} onOpenChange={setIsOpen}>
                <span>Document details opened without navigation.</span>
            </Dialog>
        </Stack>
    );
}
