import ViewLayout from './ViewLayout';
import { Text } from '@/components/ui/Text';

/** Documents Text in LongLink Views. */
export default function TextPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Text"
            examples={[
                {
                    title: 'Text',
                    preview: <TextExample />,
                    code: `function Example() {
  return <Text>Order details</Text>;
}`,
                },
            ]}
        />
    );
}

/** Renders the page's text example for documentation and the catalog. */
export function TextExample() {
    // Show normal text alongside bold and italic emphasis.
    return (
        <Text>
            Normal <b>bold</b> and <i>italic</i> text.
        </Text>
    );
}
