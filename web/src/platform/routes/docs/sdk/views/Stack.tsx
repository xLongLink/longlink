import ViewLayout from './ViewLayout';

/** Documents Stack in LongLink Views. */
export default function StackPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stack"
            examples={[
                {
                    title: 'Stack',
                    code: `function Example() {
  return (
    <Stack direction="horizontal" gap={3}>
      <Text>Label</Text>
      <StackItem size="fill">
        <Text>Flexible content</Text>
      </StackItem>
    </Stack>
  );
}`,
                },
            ]}
        />
    );
}
