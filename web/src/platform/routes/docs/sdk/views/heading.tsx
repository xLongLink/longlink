import ViewLayout from './view-layout';
import { Heading } from '@/components/custom/heading';

/** Documents Heading in LongLink Views. */
export default function HeadingPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Heading"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Heading content.' },
                { name: 'level', type: '1 | 2 | 3 | 4 | 5 | 6', description: 'Heading level from h1 to h6.' }
            ]}
            example={{
                title: 'Heading',
                preview: <HeadingExample />,
                code: `function Example() {
  return <Heading level={2}>Order details</Heading>;
}`
            }}
        />
    );
}

/** Renders the page's heading example for documentation and the catalog. */
export function HeadingExample() {
    // Display a sample section heading.
    return <Heading level={3}>Orders</Heading>;
}
