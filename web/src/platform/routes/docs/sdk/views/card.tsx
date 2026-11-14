import { Link } from 'react-router';
import ViewLayout from './view-layout';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/shadcn/card';

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
                    description: 'Native card spacing. Card and its parts also accept native div props.'
                },
                {
                    name: 'children',
                    type: 'ReactNode',
                    description:
                        'Compose CardHeader, CardTitle, CardDescription, CardAction, CardContent, and CardFooter.'
                },
                ...[
                    {
                        name: 'size',
                        type: '"default" | "sm"',
                        description:
                            'Native Card spacing; compose the same CardHeader, CardContent, and CardFooter parts.'
                    },
                    {
                        name: 'className',
                        type: 'string',
                        description: 'Native Card classes. Also accepts style and other native div props.'
                    },
                    {
                        name: 'inert',
                        type: 'boolean',
                        description: 'Makes the card and its descendants non-interactive.'
                    },
                    {
                        name: 'label',
                        type: 'string',
                        description: 'Accessible label for interactive cards; supply a descriptive label.'
                    },
                    {
                        name: 'onClick',
                        type: '(event: ViewMouseEvent) => void',
                        description: 'Runs when the card surface is activated.'
                    },
                    { name: 'href', type: 'string', description: 'Link destination, used when onChange is absent.' },
                    {
                        name: 'target',
                        type: 'string',
                        description: 'Link target; external URLs open in a new tab in Views.'
                    },
                    { name: 'isDisabled', type: 'boolean', description: 'Disables activation of an interactive card.' },
                    { name: 'isSelected', type: 'boolean', description: 'Whether the card is selected.' },
                    {
                        name: 'onChange',
                        type: '(isSelected: boolean) => void',
                        description: 'Enables selection and receives its next state, overriding onClick and href.'
                    }
                ].map((property) => ({ ...property, name: `InteractiveCard.${property.name}` }))
            ]}
            example={{
                title: 'Card with an image',
                preview: <CardExample />,
                code: `function Example() {
  return (
    <Card className="w-4/5">
      <img
        src="/images/organized-work.webp"
        alt="Illustrated library with curved bookshelves and sweeping staircases"
        className="aspect-[2/1] w-full object-cover"
        width={1672}
        height={941}
      />
      <CardHeader>
        <CardTitle>Views component library</CardTitle>
        <CardDescription>
          Forms, layouts, and data displays for LongLink solutions.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-end">
        <Button nativeButton={false} render={<a href="/docs/sdk/views/" />}>
          Browse components
          <Icon icon="arrow-right" size="sm" />
        </Button>
      </CardFooter>
    </Card>
  );
}`
            }}
        />
    );
}

/** Shows native card composition with an image and a navigation action. */
export function CardExample() {
    // Keep the image flush with the card while its parts own content spacing.
    return (
        <Card className="w-4/5">
            <img
                src="/images/organized-work.webp"
                alt="Illustrated library with curved bookshelves and sweeping staircases"
                className="aspect-[2/1] w-full object-cover"
                width={1672}
                height={941}
            />
            <CardHeader>
                <CardTitle>Views component library</CardTitle>
                <CardDescription>Forms, layouts, and data displays for LongLink solutions.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-end">
                <Button nativeButton={false} render={<Link to="/docs/sdk/views/" />}>
                    Browse components
                    <ArrowRight aria-hidden="true" />
                </Button>
            </CardFooter>
        </Card>
    );
}
