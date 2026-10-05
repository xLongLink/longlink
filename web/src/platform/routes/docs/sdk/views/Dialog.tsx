import ViewLayout from './ViewLayout';

/** Documents Dialog in LongLink Views. */
export default function DialogPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Dialog"
            examples={[
                {
                    title: 'Dialog',
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
