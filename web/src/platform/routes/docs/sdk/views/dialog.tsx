import { useState } from 'react';
import ViewLayout from './view-layout';
import { Button } from '@/components/shadcn/button';
import { Dialog } from '@/components/custom/native-dialog';
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
                    name: 'fullscreen',
                    type: 'boolean',
                    description:
                        'Allows the isolated View host to cover Platform navigation. Content sizing stays caller-owned.'
                },
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
                title: 'Dialog composition',
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
      <Dialog fullscreen open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[95dvh] w-[95dvw] max-w-[95dvw] flex-col sm:max-w-[95dvw]">
          <DialogHeader><DialogTitle>Order details</DialogTitle></DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">Order details</div>
        </DialogContent>
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
            <Dialog fullscreen open={open} onOpenChange={setOpen}>
                <DialogContent className="flex h-[95dvh] w-[95dvw] max-w-[95dvw] flex-col sm:max-w-[95dvw]">
                    <DialogHeader>
                        <DialogTitle>Order details</DialogTitle>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-auto">Order details</div>
                </DialogContent>
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
