import ViewLayout from './ViewLayout';
import { Icon } from '@/components/ui/Icon';

/** Documents Icon in LongLink Views. */
export default function IconPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Icon"
            examples={[
                {
                    title: 'Icon',
                    preview: <IconExample />,
                    code: `function Example() {
  return <Icon icon="search" size="md" />;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's icon example for documentation and the catalog. */
export function IconExample() {
    // Display the semantic information icon.
    return <Icon icon="info" size="md" />;
}
