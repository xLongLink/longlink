import ViewLayout from './ViewLayout';
import { NativeText as Text } from '@/components/ui/NativeText';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    InteractiveCard,
} from '@/components/ui/Card';

/** Documents native card composition and the custom interactive wrapper. */
export default function CardPage() {
    // Keep native composition distinct from the custom interaction contract.
    return (
        <ViewLayout
            name="Card"
            properties={[
                {
                    name: 'size',
                    type: '"default" | "sm"',
                    description: 'Native card spacing. Card and its parts also accept native div props.',
                },
                {
                    name: 'children',
                    type: 'ReactNode',
                    description:
                        'Compose CardHeader, CardTitle, CardDescription, CardAction, CardContent, and CardFooter.',
                },
                ...[
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
                ].map((property) => ({ ...property, name: `InteractiveCard.${property.name}` })),
            ]}
            example={{
                title: 'Native composition and interactive navigation',
                preview: (
                    <div className="flex flex-col gap-4">
                        <Card size="sm">
                            <CardHeader>
                                <CardTitle>Order</CardTitle>
                                <CardDescription>Delivery information</CardDescription>
                            </CardHeader>
                            <CardContent>Order details</CardContent>
                            <CardFooter>Ready to ship</CardFooter>
                        </Card>
                        <InteractiveCard label="Open orders" href="/orders" padding={3}>
                            <Text>Open orders</Text>
                        </InteractiveCard>
                    </div>
                ),
                code: `function Example() {
  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Order</CardTitle>
          <CardDescription>Delivery information</CardDescription>
        </CardHeader>
        <CardContent>Order details</CardContent>
        <CardFooter>Ready to ship</CardFooter>
      </Card>
      <InteractiveCard label="Open orders" href="/orders" padding={3}>
        <Text>Open orders</Text>
      </InteractiveCard>
    </>
  );
}`,
            }}
        />
    );
}
