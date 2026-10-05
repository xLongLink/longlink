import ViewLayout from './ViewLayout';

/** Documents Grid in LongLink Views. */
export default function GridPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Grid"
            examples={[
                {
                    title: 'Grid',
                    code: `function Example() {
  return (
    <Grid columns={2} gap={3}>
      <Text>First column</Text>
      <GridSpan columns="full">
        <Text>Full-width content</Text>
      </GridSpan>
    </Grid>
  );
}`,
                },
            ]}
        />
    );
}
