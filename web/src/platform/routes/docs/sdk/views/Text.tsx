import ViewLayout from './ViewLayout';
import { Text } from '@/components/ui/Text';

/** Documents Text in LongLink Views. */
export default function TextPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Text"
            introduction={
                "Displays View text with Astryx's semantic typography, alignment, wrapping, and truncation controls."
            }
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Text content.',
                },
                {
                    name: 'color',
                    type: '"primary" | "secondary" | "disabled" | "placeholder" | "accent" | "inherit"',
                    description: 'Text color; defaults to secondary for supporting text and primary otherwise.',
                },
                {
                    name: 'type',
                    type: '"code" | "inherit" | "body" | "large" | "label" | "supporting" | "display-1" | "display-2" | "display-3"',
                    description: 'Theme text style, or inherit to match surrounding text.',
                },
                {
                    name: 'size',
                    type: '"4xs" | "3xs" | "2xs" | "xsm" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl"',
                    description: 'Font size override for the selected text style.',
                },
                {
                    name: 'weight',
                    type: '"bold" | "normal" | "medium" | "semibold"',
                    description: 'Font weight override.',
                },
                {
                    name: 'display',
                    type: '"inline" | "block"',
                    description:
                        "Display type. Silently overridden to 'block' when maxLines > 0 or hasCapsize is true.",
                },
                {
                    name: 'as',
                    type: '"label" | "span" | "p" | "div" | "h1" | "h2" | "h3"',
                    description: 'HTML element to render.',
                },
                {
                    name: 'maxLines',
                    type: 'number',
                    description: 'Maximum visible lines before truncation; 0 disables truncation.',
                },
                {
                    name: 'hasTruncateTooltip',
                    type: 'boolean | "start" | "end" | "above" | "below"',
                    description: 'Enables, disables, or positions the tooltip for truncated text.',
                },
                {
                    name: 'wordBreak',
                    type: '"break-word" | "break-all"',
                    description: 'Word breaking for truncated text.',
                },
                {
                    name: 'textWrap',
                    type: '"nowrap" | "wrap" | "balance" | "pretty"',
                    description: 'Text wrapping behavior.',
                },
                {
                    name: 'justify',
                    type: '"start" | "center" | "end"',
                    description:
                        'Text alignment (justification). Uses logical values (start/end) for i18n/RTL compatibility.',
                },
                {
                    name: 'hasCapsize',
                    type: 'boolean',
                    description: 'Enable optical alignment using text-box-trim. Forces block display.',
                },
                {
                    name: 'hasStrikethrough',
                    type: 'boolean',
                    description: 'Apply strikethrough text decoration.',
                },
                {
                    name: 'hasTabularNumbers',
                    type: 'boolean',
                    description: 'Use tabular (monospace) numbers for aligned numeric data.',
                },
            ]}
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
