import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/shadcn/button';

/** Documents the custom modal frame used by isolated Views. */
export default function DialogPage() {
    return (
        <ViewLayout
            name="Dialog"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Dialog content.' },
                { name: 'isOpen', type: 'boolean', description: 'Controlled open state.' },
                { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Open-state callback.' },
                { name: 'title', type: 'string', description: 'Optional fixed header.' },
                {
                    name: 'variant',
                    type: '"standard" | "fullscreen"',
                    description: 'Fixed frame or fullscreen overlay.'
                },
                { name: 'gap', type: 'Spacing', description: 'Space between the header and body.' },
                { name: 'paddingInline', type: 'Spacing', description: 'Body inline padding.' }
            ]}
            example={{
                title: 'Fullscreen frame',
                preview: <DialogExample />,
                code: `function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open fullscreen</Button>
      <Dialog title="Order details" variant="fullscreen" isOpen={open} onOpenChange={setOpen}>
        <p>Order details</p>
      </Dialog>
    </>
  );
}`
            }}
        />
    );
}

/** Shows host-coordinated fullscreen behavior only after activation. */
export function DialogExample() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Open fullscreen</Button>
            <Dialog title="Order details" variant="fullscreen" isOpen={open} onOpenChange={setOpen}>
                <p>Order details</p>
            </Dialog>
        </>
    );
}
