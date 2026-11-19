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
            example={{
                title: 'Link',
                preview: <LinkExample />,
                code: `function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Stack>
      <Link href="/orders">Orders</Link>
      <Link onClick={() => download("/api/documents/sample", "sample-document.txt")}>
        sample-document.txt
      </Link>
      <Link onClick={() => setIsOpen(true)} aria-haspopup="dialog">Preview document</Link>
      {isOpen && (
        <Dialog title="sample-document.txt" open onOpenChange={setIsOpen}>
          <FileViewer src="/api/documents/sample" title="sample-document.txt" />
        </Dialog>
      )}
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
