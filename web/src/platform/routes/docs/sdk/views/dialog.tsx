import { useState } from 'react';
import ViewLayout from './view-layout';
import { Dialog } from '@/components/custom/dialog';
import { Button } from '@/components/shadcn/button';
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
                    name: 'isOpen',
                    type: 'boolean',
                    description: 'Controlled visibility with a built-in modal frame; requires onOpenChange.'
                },
                { name: 'title', type: 'string', description: 'Optional fixed header for the built-in frame.' },
                {
                    name: 'variant',
                    type: '"standard" | "fullscreen"',
                    description: 'Built-in frame size, with isolated View host coordination.'
                },
                { name: 'gap', type: 'Spacing', description: 'Space between the frame header and body.' },
                { name: 'paddingInline', type: 'Spacing', description: 'Frame body inline padding.' },
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
                title: 'Dialog',
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

/** Shows host-coordinated fullscreen behavior after activation. */
function FullscreenDialogExample() {
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
