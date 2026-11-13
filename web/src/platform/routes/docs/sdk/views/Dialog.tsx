import ViewLayout from './ViewLayout';
import { Button } from '@/components/shadcn/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/Dialog';

/** Documents the native shadcn Dialog composition. */
export default function DialogPage() {
    return (
        <ViewLayout
            name="Dialog"
            properties={[
                { name: 'open', type: 'boolean', description: 'Controlled open state.' },
                { name: 'defaultOpen', type: 'boolean', description: 'Initial uncontrolled open state.' },
                {
                    name: 'onOpenChange',
                    type: '(open, eventDetails) => void',
                    description: 'Native open-state callback.',
                },
                { name: 'modal', type: 'boolean | "trap-focus"', description: 'Modal interaction and focus behavior.' },
                { name: 'DialogTrigger.render', type: 'ReactElement', description: 'Compose a trigger with a Button.' },
                { name: 'DialogContent.children', type: 'ReactNode', description: 'Dialog header, body, and footer.' },
                { name: 'DialogContent.showCloseButton', type: 'boolean', description: 'Defaults to true.' },
            ]}
            example={{
                title: 'Dialog',
                preview: <DialogExample />,
                code: `function Example() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open details</DialogTrigger>
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
}`,
            }}
        />
    );
}

/** Opens a native modal through its composed trigger. */
export function DialogExample() {
    return (
        <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Open details</DialogTrigger>
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
