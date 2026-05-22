import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';

/** Renders the XML field page. */
export default function XmlFieldPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">Field</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Field components group labels, inputs, controls, and validation text into a single form layout.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field>
  <FieldLabel htmlFor="name">Full name</FieldLabel>
  <Input id="name" autoComplete="name" value="Evil Rabbit" placeholder="Evil Rabbit" />
  <FieldDescription>This appears on invoices and emails.</FieldDescription>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="input" level="h2" className="text-foreground">Input</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>InputGroup</Code> when the input needs an icon, addon, or action button.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field>
  <FieldLabel htmlFor="name">Full name</FieldLabel>
  <Input id="name" autoComplete="off" placeholder="Evil Rabbit" />
  <FieldDescription>This appears on invoices and emails.</FieldDescription>
</Field>

<Field>
  <FieldLabel htmlFor="username">Username</FieldLabel>
  <InputGroup>
    <InputGroupAddon>
      <Icon name="user" />
    </InputGroupAddon>
    <InputGroupInput id="username" autoComplete="username" placeholder="evil.rabbit" value="evil.rabbit" />
    <InputGroupButton>Check</InputGroupButton>
  </InputGroup>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="textarea" level="h2" className="text-foreground">Textarea</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field>
  <FieldLabel htmlFor="notes">Notes</FieldLabel>
  <Textarea id="notes" rows="4" placeholder="Add notes here" />
  <FieldDescription>Keep the note short and clear.</FieldDescription>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="select" level="h2" className="text-foreground">Select</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field>
  <FieldLabel htmlFor="department">Department</FieldLabel>
  <Select id="department" defaultValue="design">
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="design">Design</SelectItem>
      <SelectItem value="engineering">Engineering</SelectItem>
    </SelectContent>
  </Select>
  <FieldDescription>Select the team this user belongs to.</FieldDescription>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="slider" level="h2" className="text-foreground">Slider</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field>
  <FieldLabel htmlFor="budget">Budget</FieldLabel>
  <Slider id="budget" min="0" max="100" step="5" value="50" />
  <FieldDescription>Set the allowed budget range.</FieldDescription>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="checkbox" level="h2" className="text-foreground">Checkbox</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field orientation="horizontal">
  <Checkbox id="newsletter" />
  <FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="radiogroup" level="h2" className="text-foreground">RadioGroup</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field>
  <FieldLabel>Priority</FieldLabel>
  <RadioGroup name="priority" defaultValue="medium">
    <RadioGroupItem value="low">Low</RadioGroupItem>
    <RadioGroupItem value="medium">Medium</RadioGroupItem>
    <RadioGroupItem value="high">High</RadioGroupItem>
  </RadioGroup>
  <FieldDescription>Choose the default handling priority.</FieldDescription>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="switch" level="h2" className="text-foreground">Switch</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field orientation="horizontal">
  <Switch id="notifications" />
  <FieldLabel htmlFor="notifications">Enable notifications</FieldLabel>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="toggle" level="h2" className="text-foreground">Toggle</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field orientation="horizontal">
  <Toggle pressed="settings.enabled" id="enabled" size="sm">
    Enabled
  </Toggle>
  <FieldLabel htmlFor="enabled">Enabled</FieldLabel>
</Field>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="togglegroup" level="h2" className="text-foreground">ToggleGroup</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Field>
  <FieldLabel>Mode</FieldLabel>
  <ToggleGroup type="single">
    <ToggleGroupItem value="a">A</ToggleGroupItem>
    <ToggleGroupItem value="b">B</ToggleGroupItem>
    <ToggleGroupItem value="c">C</ToggleGroupItem>
  </ToggleGroup>
</Field>`}</code>
                </pre>
            </section>
        </article>
    );
}
