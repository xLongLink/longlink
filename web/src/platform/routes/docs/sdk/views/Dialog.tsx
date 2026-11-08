import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';

/** Documents Dialog in LongLink Views. */
export default function DialogPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Dialog"
            isLongLinkSpecific
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Dialog content.',
                },
                {
                    name: 'title',
                    type: 'string',
                    description: 'Shows a dialog header when a title is provided.',
                },
                {
                    name: 'variant',
                    type: '"standard" | "fullscreen"',
                    description:
                        'Standard uses the fixed frame. Fullscreen fills about 95% of the screen, including over Platform navigation.',
                },
                {
                    name: 'isOpen',
                    type: 'boolean',
                    description: 'Whether the dialog is open.',
                },
                {
                    name: 'onOpenChange',
                    type: '(open: boolean) => void',
                    description: 'Callback when dialog visibility changes.',
                },
                {
                    name: 'gap',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Spacing between the title and content; defaults to 3.',
                },
            ]}
            introduction="Dialog defaults to the Platform's 960px-wide, 560px-high frame, reduced to fit shorter viewports. Set variant to fullscreen to fill about 95% of the screen, including over Platform navigation. Fullscreen keeps Solution content sandboxed and temporarily blocks the surrounding Platform controls. Closing it restores the View layout without losing state. A title adds a visible header; otherwise only the close control is shown. The gap between title and content defaults to spacing step 3, matching Stack and Grid. Escape and the close button dismiss it; clicking the backdrop does not. The body scrolls while the header stays visible."
            example={{
                title: 'Dialog',
                preview: <DialogExample />,
                code: `function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Stack gap={3}>
      <Button label="Open fullscreen dialog" onClick={() => setIsOpen(true)} />
      <Dialog
        variant="fullscreen"
        title="Order details"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <Stack gap={3} padding={4}>
          <Text>Order details</Text>
          <Button label="Close" onClick={() => setIsOpen(false)} />
        </Stack>
      </Dialog>
    </Stack>
  );
}`,
            }}
        />
    );
}

/** Opens a real modal only when the user requests this example. */
export function DialogExample() {
    const [isOpen, setIsOpen] = useState(false);

    // Let the actual dialog wrapper own modal behavior and focus management.
    return (
        <>
            <Button label="Open fullscreen dialog" onClick={() => setIsOpen(true)} />
            <Dialog variant="fullscreen" title="Order details" isOpen={isOpen} onOpenChange={setIsOpen}>
                <Stack gap={3} padding={4}>
                    <Text>Order details</Text>
                    <Button label="Close" onClick={() => setIsOpen(false)} />
                </Stack>
            </Dialog>
        </>
    );
}
