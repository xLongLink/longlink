import ViewLayout from './view-layout';
import { Text } from '@/components/custom/text';

/** Documents Text in LongLink Views. */
export default function TextPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Text"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Text content.' },
                {
                    name: 'as',
                    type: '"label" | "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"',
                    description: 'HTML element to render; defaults to span.'
                },
                {
                    name: 'maxLines',
                    type: 'number',
                    description: 'Maximum visible lines before truncation; 0 disables truncation.'
                },
                {
                    name: 'hasTruncateTooltip',
                    type: 'boolean | "start" | "end" | "above" | "below"',
                    description: 'Enables, disables, or positions the tooltip for truncated text.'
                },
                { name: 'className', type: 'string', description: 'Tailwind utilities for typography and appearance.' },
                { name: 'style', type: 'CSSProperties', description: 'Native inline styles.' },
                { name: 'ref', type: 'Ref<HTMLElement>', description: 'Reference to the rendered text element.' }
            ]}
            example={{
                title: 'Text',
                preview: <TextExample />,
                code: `function Example() {
  return <Text className="text-sm text-muted-foreground">Order details</Text>;
}`
            }}
        />
    );
}

/** Renders the page's text example for documentation and the catalog. */
export function TextExample() {
    // Show normal text alongside bold and italic emphasis.
    return (
        <Text className="text-sm text-muted-foreground">
            Normal <b>bold</b> and <i>italic</i>
        </Text>
    );
}
