import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Window } from '@/components/Window';

/** Renders the XML field page. */
export default function XmlFieldPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">
                    Field
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Field components group labels, inputs, controls, and validation text into a single form layout.</P>
                <Window>{`<Field><FieldLabel>Full name</FieldLabel><Input /></Field>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="input" level="h2" className="text-foreground">
                    Input
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>InputGroup</Code> when the input needs an icon, addon, or action button.
                </P>
                <Window>{`<Input id="name" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="textarea" level="h2" className="text-foreground">
                    Textarea
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Textarea id="notes" rows="4" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="select" level="h2" className="text-foreground">
                    Select
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Select id="department" defaultValue="design" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="slider" level="h2" className="text-foreground">
                    Slider
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Slider id="budget" min="0" max="100" step="5" value="50" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="checkbox" level="h2" className="text-foreground">
                    Checkbox
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Checkbox id="newsletter" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="radiogroup" level="h2" className="text-foreground">
                    RadioGroup
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<RadioGroup name="priority" defaultValue="medium" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="switch" level="h2" className="text-foreground">
                    Switch
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Switch id="notifications" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="toggle" level="h2" className="text-foreground">
                    Toggle
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Toggle pressed="settings.enabled" id="enabled" size="sm">Enabled</Toggle>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="togglegroup" level="h2" className="text-foreground">
                    ToggleGroup
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<ToggleGroup type="single" />`}</Window>
            </section>
        </article>
    );
}
