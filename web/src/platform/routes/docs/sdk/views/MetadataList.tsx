import ViewLayout from './ViewLayout';
import { MetadataList, MetadataListItem } from '@/components/ui/MetadataList';

/** Documents MetadataList in LongLink Views. */
export default function MetadataListPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MetadataList"
            examples={[
                {
                    title: 'MetadataList',
                    preview: <MetadataListExample />,
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

/** Renders the page's metadata example for documentation and the catalog. */
export function MetadataListExample() {
    // Display the sample order's owner and status.
    return (
        <MetadataList title="Order details">
            <MetadataListItem label="Owner">Ada Lovelace</MetadataListItem>
            <MetadataListItem label="Status">Open</MetadataListItem>
        </MetadataList>
    );
}
