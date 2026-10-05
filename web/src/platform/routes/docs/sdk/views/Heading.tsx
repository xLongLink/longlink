import ViewLayout from './ViewLayout';
import { Heading } from '@/components/ui/Heading';

/** Documents Heading in LongLink Views. */
export default function HeadingPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Heading"
            examples={[
                {
                    title: 'Heading',
                    preview: <HeadingExample />,
                    code: `function Example() {
  return <Heading level={2}>Order details</Heading>;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's heading example for documentation and the catalog. */
export function HeadingExample() {
    // Display a sample section heading.
    return <Heading level={3}>Orders</Heading>;
}
