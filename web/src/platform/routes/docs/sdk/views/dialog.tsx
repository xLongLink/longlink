import ViewLayout from './view-layout';
import { Button } from '@/components/shadcn/button';
import {
    Dialog,
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
                preview: <DialogExample />,
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
</Dialog>`
            }}
        />
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
