import { useState } from 'react';
import ViewLayout from './view-layout';
import { Input } from '@/components/longlink/form/input';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import catalog from '../../../../../../../sdk/longlink/.static/jsx/components.json';

/** Shows the same owned dialog API in centered and fullscreen layouts. */
export function DialogExample({ fullscreen = false }: { fullscreen?: boolean }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
            title="Order details"
            description="Review this order before continuing."
            fullscreen={fullscreen}
            trigger={<Button variant="outline">{fullscreen ? 'Open fullscreen' : 'Open dialog'}</Button>}
            footer={
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Done
                </Button>
            }
        >
            <Input name="reference" label="Reference" defaultValue="PO-871" />
        </Dialog>
    );
}

/** Documents caller-owned state with internal modal layout and focus management. */
export default function DialogPage() {
    const component = catalog.components.find((entry) => entry.name === 'Dialog');

    return (
        <ViewLayout
            name="Dialog"
            properties={component?.properties ?? []}
            example={{
                title: 'Dialog',
                preview: (
                    <div className="flex flex-wrap gap-2">
                        <DialogExample />
                        <DialogExample fullscreen />
                    </div>
                ),
                code: `function Example() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Order details"
      description="Review this order before continuing."
      trigger={<Button variant="outline">Open dialog</Button>}
      footer={<Button type="button" variant="outline" onClick={() => setOpen(false)}>Done</Button>}
    >
      <Input name="reference" label="Reference" defaultValue="PO-871" />
    </Dialog>
  );
}`
            }}
        />
    );
}
