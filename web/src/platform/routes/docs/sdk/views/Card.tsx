import ViewLayout from './ViewLayout';
import { Card } from '@/components/ui/Card';
import { Text } from '@astryxdesign/core/Text';

/** Documents plain, clickable, and selectable cards. */
export default function CardPage() {
    // Render the card contract alongside a plain card example.
    return (
        <ViewLayout
            name="Card"
            isLongLinkSpecific
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Content rendered inside the card.',
                },
                {
                    name: 'padding',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                    description: 'Inner spacing using the theme spacing scale.',
                },
                {
                    name: 'isClipped',
                    type: 'boolean',
                    description: "Clips full-bleed content to the card's rounded edges.",
                },
                {
                    name: 'variant',
                    type: '"default" | "transparent" | "muted"',
                    description: 'Background color variant, independent of the interaction mode.',
                },
                {
                    name: 'width',
                    type: 'string | number',
                    description: 'Card width; numbers are pixels and strings are CSS sizes.',
                },
                {
                    name: 'height',
                    type: 'string | number',
                    description: 'Card height; numbers are pixels and strings are CSS sizes.',
                },
                {
                    name: 'maxWidth',
                    type: 'string | number',
                    description: 'Maximum card width.',
                },
                {
                    name: 'minHeight',
                    type: 'string | number',
                    description: 'Minimum card height.',
                },
                {
                    name: 'inert',
                    type: 'boolean',
                    description: 'Makes the card and its descendants non-interactive.',
                },
                {
                    name: 'label',
                    type: 'string',
                    description: 'Accessible label for interactive cards; supply a descriptive label.',
                },
                {
                    name: 'onClick',
                    type: '(event: ViewMouseEvent) => void',
                    description: 'Runs when the card surface is activated.',
                },
                {
                    name: 'href',
                    type: 'string',
                    description: 'Link destination, used when onChange is absent.',
                },
                {
                    name: 'target',
                    type: 'string',
                    description: 'Link target; external URLs open in a new tab in Views.',
                },
                {
                    name: 'isDisabled',
                    type: 'boolean',
                    description: 'Disables activation of an interactive card.',
                },
                {
                    name: 'isSelected',
                    type: 'boolean',
                    description: 'Whether the card is selected.',
                },
                {
                    name: 'onChange',
                    type: '(isSelected: boolean) => void',
                    description: 'Enables selection and receives its next state, overriding onClick and href.',
                },
            ]}
            introduction="Card has one shared set of props. onChange makes it selectable, onClick or href makes it clickable, and otherwise it is a plain content card. Selection takes priority when both kinds of interaction props are supplied."
            examples={[
                {
                    title: 'Plain card',
                    preview: (
                        <Card padding={3}>
                            <Text>Order details</Text>
                        </Card>
                    ),
                    code: `function Example() {
  return (
    <Card padding={3}>
      <Text>Order details</Text>
    </Card>
  );
}`,
                },
            ]}
        />
    );
}
