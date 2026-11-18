import { useState } from 'react';
import ViewLayout from './view-layout';
import { Input } from '@/components/longlink/form/input';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';

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
            width={640}
            height="auto"
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
    return (
        <ViewLayout
            name="Dialog"
            example={{
                title: 'Dialog',
                preview: (
                    <Stack direction="horizontal" wrap="wrap" gap={2}>
                        <DialogExample />
                        <DialogExample fullscreen />
                    </Stack>
                ),
                code: `function Example() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Order details"
      description="Review this order before continuing."
      width={640}
      height="auto"
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
