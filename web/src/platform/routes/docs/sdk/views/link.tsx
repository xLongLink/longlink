import { useState } from 'react';
import ViewLayout from './view-layout';
import { Link } from '@/components/custom/link';
import { Button } from '@/components/shadcn/button';
import { FramedDialog } from '@/components/custom/framed-dialog';
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
                    description: 'Navigation destination. Solution-relative paths stay within the Solution.'
                },
                {
                    name: 'AttachmentLink.preview',
                    type: 'string',
                    description: 'Open a scoped Solution file in a preview dialog using this filename as its title.'
                },
                {
                    name: 'AttachmentLink.download',
                    type: 'string',
                    description: 'Download filename for a scoped Solution attachment instead of navigation.'
                },
                { name: 'AttachmentLink.href', type: 'string', description: 'Scoped Solution file path.' },
                { name: 'AttachmentLink.disabled', type: 'boolean', description: 'Disables the attachment action.' },
                {
                    name: 'onClick',
                    type: 'MouseEventHandler<HTMLAnchorElement>',
                    description: 'Native click handler. Call preventDefault() to cancel navigation.'
                },
                { name: 'children', type: 'ReactNode', description: 'Caller-owned link content.' },
                {
                    name: '...props',
                    type: 'ComponentPropsWithRef<"a">',
                    description:
                        'Native anchor props and ref, except download. Use AttachmentLink for scoped files and Button variant="link" for actions.'
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
      <AttachmentLink href="/api/documents/sample" preview="sample-document.txt">
        sample-document.txt
      </AttachmentLink>
      <AttachmentLink href="/api/documents/sample" download="sample-document.txt">
        sample-document.txt
      </AttachmentLink>
      <Button variant="link" onClick={() => setIsOpen(true)}>Document details</Button>
      <FramedDialog title="Document details" open={isOpen} onOpenChange={setIsOpen}>
        <Stack padding={4}>
          <Text>Document details opened without navigation.</Text>
        </Stack>
      </FramedDialog>
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
            <Button variant="link" onClick={() => setIsOpen(true)}>
                Document details
            </Button>
            <FramedDialog title="Document details" open={isOpen} onOpenChange={setIsOpen}>
                <Stack padding={4}>
                    <span>Document details opened without navigation.</span>
                </Stack>
            </FramedDialog>
        </Stack>
    );
}
