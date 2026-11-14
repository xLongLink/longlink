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
  return (
    <div className="flex flex-col items-center text-center">
      <Heading level={1}>Heading 1</Heading>
      <Heading level={2}>Heading 2</Heading>
      <Heading level={3}>Heading 3</Heading>
      <Heading level={4}>Heading 4</Heading>
      <Heading level={5}>Heading 5</Heading>
      <Heading level={6}>Heading 6</Heading>
    </div>
  );
}`
            }}
        />
    );
}

/** Renders the page's heading example for documentation and the catalog. */
export function HeadingExample() {
    // Display heading levels from largest to smallest.
    return (
        <div className="flex flex-col items-center text-center">
            <Heading level={1}>Heading 1</Heading>
            <Heading level={2}>Heading 2</Heading>
            <Heading level={3}>Heading 3</Heading>
            <Heading level={4}>Heading 4</Heading>
            <Heading level={5}>Heading 5</Heading>
            <Heading level={6}>Heading 6</Heading>
        </div>
    );
}
