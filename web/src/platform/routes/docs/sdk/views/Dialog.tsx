import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

/** Documents Dialog in LongLink Views. */
export default function DialogPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Dialog"
            introduction="Dialog is modal within the isolated View viewport. It does not block the surrounding Platform navigation. Its content scrolls when it exceeds the available View height."
            examples={[
                {
                    title: 'Dialog',
                    preview: <DialogExample />,
                    code: `function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Stack gap={3}>
      <Button label="Open dialog" onClick={() => setIsOpen(true)} />
      <Dialog
        aria-label="Order details"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <Text>Order details</Text>
        <Button label="Close" onClick={() => setIsOpen(false)} />
      </Dialog>
    </Stack>
  );
}`,
                },
            ]}
        />
    );
}

/** Opens a real modal only when the user requests this example. */
export function DialogExample() {
    const [isOpen, setIsOpen] = useState(false);

    // Let the actual dialog wrapper own modal behavior and focus management.
    return (
        <>
            <Button label="Open dialog" onClick={() => setIsOpen(true)} />
            <Dialog aria-label="Edit order" isOpen={isOpen} onOpenChange={setIsOpen}>
                <Text>Order details</Text>
                <Button label="Close" onClick={() => setIsOpen(false)} />
            </Dialog>
        </>
    );
}
