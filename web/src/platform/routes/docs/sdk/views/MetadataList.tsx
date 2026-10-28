import ViewLayout from './ViewLayout';
import { MetadataList, MetadataListItem } from '@/components/ui/MetadataList';

/** Documents MetadataList in LongLink Views. */
export default function MetadataListPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MetadataList"
            introduction={'Lists labeled values with optional truncation and label placement.'}
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Metadata items (MetadataListItem components).',
                },
                {
                    name: 'columns',
                    type: 'number | "multi" | "single"',
                    description: 'Column layout mode.',
                },
                {
                    name: 'title',
                    type: 'ReactNode',
                    description: 'Optional title or heading above the list.',
                },
                {
                    name: 'label',
                    type: '{ position: "start" | "top"; width?: string | number; }',
                    description: 'Label position and optional column width.',
                },
                {
                    name: 'maxNumOfItems',
                    type: 'number',
                    description: 'Maximum items to show before collapsing with a show more/less toggle.',
                },
                {
                    name: 'orientation',
                    type: '"horizontal" | "vertical"',
                    description: 'Layout orientation. Horizontal mode flows items in a row with flex-wrap.',
                },
                {
                    name: 'MetadataListItem.children',
                    type: 'ReactNode',
                    description: 'Value rendered beside the metadata label.',
                },
                {
                    name: 'MetadataListItem.label',
                    type: 'string',
                    description: 'Label identifying the metadata value.',
                },
                {
                    name: 'MetadataListItem.icon',
                    type: 'StoneIconName',
                    description: 'Optional icon displayed beside the metadata label.',
                },
            ]}
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
