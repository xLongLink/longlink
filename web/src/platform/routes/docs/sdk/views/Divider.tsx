import ViewLayout from './ViewLayout';

/** Documents Divider in LongLink Views. */
export default function DividerPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Divider"
            examples={[
                {
                    title: 'Divider',
                    code: `function Example() {
  return (
    <Stack gap={3}>
      <Text>Before</Text>
      <Divider />
      <Text>After</Text>
    </Stack>
  );
}`,
                },
            ]}
        />
    );
}
