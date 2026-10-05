import ViewLayout from './ViewLayout';

/** Documents MetadataList in LongLink Views. */
export default function MetadataListPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MetadataList"
            examples={[
                {
                    title: 'MetadataList',
                    code: `function Example() {
  return (
    <MetadataList title="Order details">
      <MetadataListItem label="Owner">Ada Lovelace</MetadataListItem>
      <MetadataListItem label="Status">Open</MetadataListItem>
    </MetadataList>
  );
}`,
                },
            ]}
        />
    );
}
