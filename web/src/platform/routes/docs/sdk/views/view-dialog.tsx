import { useState } from 'react';
import ViewLayout from './view-layout';
import { Button } from '@/components/shadcn/button';
import { ViewDialog } from '@/components/custom/view-dialog';

/** Documents the custom modal frame used by isolated Views. */
export default function ViewDialogPage() {
    return (
        <ViewLayout
            name="ViewDialog"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'ViewDialog content.' },
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
                preview: <ViewDialogExample />,
                code: `function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open fullscreen</Button>
      <ViewDialog title="Order details" variant="fullscreen" isOpen={open} onOpenChange={setOpen}>
        <p>Order details</p>
      </ViewDialog>
    </>
  );
}`
            }}
        />
    );
}

/** Shows host-coordinated fullscreen behavior only after activation. */
export function ViewDialogExample() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Open fullscreen</Button>
            <ViewDialog title="Order details" variant="fullscreen" isOpen={open} onOpenChange={setOpen}>
                <p>Order details</p>
            </ViewDialog>
        </>
    );
}
