import { useState } from 'react';
import ViewLayout from './view-layout';
import { Dialog } from '@/components/custom/dialog';
import { Button } from '@/components/shadcn/button';
import { FramedDialog } from '@/components/custom/framed-dialog';
import {
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/shadcn/dialog';

export default function DialogPage() {
    return (
        <ViewLayout
            name="Dialog"
            properties={[
                { name: 'open / defaultOpen', type: 'boolean', description: 'Controlled or initial visibility.' },
                { name: 'onOpenChange', type: '(open, details) => void', description: 'Receives visibility changes.' },
                {
                    name: 'FramedDialog.open',
                    type: 'boolean',
                    description: 'Controlled visibility for the custom frame; requires onOpenChange.'
                },
                {
                    name: 'FramedDialog.title',
                    type: 'string',
                    description: 'Optional fixed header for the custom frame.'
                },
                {
                    name: 'FramedDialog.variant',
                    type: '"standard" | "fullscreen"',
                    description: 'Custom frame size, with isolated View host coordination.'
                },
                { name: 'FramedDialog.gap', type: 'Spacing', description: 'Space between the frame header and body.' },
                { name: 'FramedDialog.paddingInline', type: 'Spacing', description: 'Frame body inline padding.' },
                {
                    name: 'DialogTrigger.render',
                    type: 'ReactElement',
                    description: 'Compose the trigger with a native Button.'
                },
                {
                    name: 'DialogContent.children',
                    type: 'ReactNode',
                    description: 'Compose DialogHeader, DialogTitle, DialogDescription, and DialogFooter.'
                }
            ]}
            example={{
                title: 'Native Dialog and custom FramedDialog',
                preview: (
                    <div className="flex flex-wrap gap-2">
                        <DialogExample />
                        <FullscreenDialogExample />
                    </div>
                ),
                code: `<Dialog>
  <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Order details</DialogTitle>
      <DialogDescription>Review this order before continuing.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>

function FullscreenExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open fullscreen</Button>
      <FramedDialog title="Order details" variant="fullscreen" open={open} onOpenChange={setOpen}>
        <p>Order details</p>
      </FramedDialog>
    </>
  );
}`
            }}
        />
    );
}

/** Shows host-coordinated fullscreen behavior after activation. */
function FullscreenDialogExample() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Open fullscreen</Button>
            <FramedDialog title="Order details" variant="fullscreen" open={open} onOpenChange={setOpen}>
                <p>Order details</p>
            </FramedDialog>
        </>
    );
}

export function DialogExample() {
    return (
        <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Order details</DialogTitle>
                    <DialogDescription>Review this order before continuing.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
