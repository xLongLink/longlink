import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';

/** Renders the XML components page. */
export default function XmlComponentsPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">Components</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Reusable UI components and bridge tags for XML pages.
                </P>
            </section>

            <section className="space-y-4">
                <Heading id="avatar" level="h2" className="text-foreground">Avatar</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Avatar size="sm">
  <AvatarImage src="/ada.png" alt="Ada Lovelace" />
  <AvatarFallback>AL</AvatarFallback>
  <AvatarBadge>1</AvatarBadge>
</Avatar>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="badge" level="h2" className="text-foreground">Badge</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Badge variant="secondary">New</Badge>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="text" level="h2" className="text-foreground">Text</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Renders inline text content and formatting.
                </P>
                <Ul className="text-muted-foreground">
                    <Li><Code>A</Code> links to another page or resource.</Li>
                    <Li><Code>B</Code> renders bold inline text.</Li>
                    <Li><Code>Code</Code> renders inline monospace text.</Li>
                    <Li><Code>S</Code> renders strikethrough text.</Li>
                    <Li><Code>Sub</Code> renders subscript text.</Li>
                    <Li><Code>Sup</Code> renders superscript text.</Li>
                    <Li><Code>P</Code> renders a standard paragraph.</Li>
                    <Li><Code>U</Code> renders underlined text.</Li>
                </Ul>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<A href="/settings" active="always">Open settings</A>
<B>Important</B>
<Code>@radix-ui/react-alert-dialog</Code>
<S>Deprecated</S>
<P>Use explicit paragraph text.</P>
<Sub>n</Sub>
<Sup>2</Sup>
<U>Underlined</U>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="title" level="h2" className="text-foreground">Title</Heading>
                <P className="max-w-3xl text-muted-foreground">Renders page title levels.</P>
                <Ul className="text-muted-foreground">
                    <Li><Code>H1</Code> primary heading for a page.</Li>
                    <Li><Code>H2</Code> second-level heading.</Li>
                    <Li><Code>H3</Code> third-level heading.</Li>
                    <Li><Code>H4</Code> fourth-level heading.</Li>
                </Ul>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<H1>Dashboard</H1>
<H2>Overview</H2>
<H3>Usage</H3>
<H4>Activity</H4>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="lists" level="h2" className="text-foreground">Lists</Heading>
                <P className="max-w-3xl text-muted-foreground">Renders ordered and unordered lists.</P>
                <Ul className="text-muted-foreground">
                    <Li><Code>Ol</Code> renders an ordered list.</Li>
                    <Li><Code>Ul</Code> renders an unordered list.</Li>
                    <Li><Code>Li</Code> renders a list item inside <Code>Ol</Code> or <Code>Ul</Code>.</Li>
                </Ul>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Ol>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ol>

<Ul>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ul>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="buttons" level="h2" className="text-foreground">Buttons</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Ul className="text-muted-foreground">
                    <Li><Code>Button</Code> renders a single action.</Li>
                    <Li><Code>ButtonGroup</Code> arranges related buttons.</Li>
                </Ul>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Button variant="default">
  Create issue
</Button>

<ButtonGroup orientation="horizontal">
  <Button variant="outline">Cancel</Button>
  <ButtonGroupText>or</ButtonGroupText>
  <Button>Save</Button>
</ButtonGroup>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="hr" level="h2" className="text-foreground">Hr</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Ul className="text-muted-foreground">
                    <Li><Code>Hr</Code> renders a visual separator.</Li>
                    <Li><Code>Br</Code> renders a line break for visual separation.</Li>
                </Ul>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Hr />
<Br />`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="hero" level="h2" className="text-foreground">Hero</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Hero icon="layout-grid">
  <HeroTitle>Organizations</HeroTitle>
  <HeroDescription>Browse the organizations you belong to.</HeroDescription>
  <HeroAction>
    <Action action="/organizations/new">Create organization</Action>
  </HeroAction>
</Hero>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="icon" level="h2" className="text-foreground">Icon</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Icon name="layout-grid" />`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="table" level="h2" className="text-foreground">Table</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Table>
  <Thead>
    <Tr>
      <Th>Quarter</Th>
      <Th>Revenue</Th>
      <Th>Growth</Th>
      <Th>Status</Th>
    </Tr>
  </Thead>
  <Tbody>
    <Tr>
      <Td>Q1</Td>
      <Td>$120k</Td>
      <Td>12%</Td>
      <Td>On track</Td>
    </Tr>
  </Tbody>
</Table>`}</code>
                </pre>
            </section>
        </article>
    );
}
