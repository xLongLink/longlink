import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';
import { Window } from '@/components/Window';

/** Renders the XML components page. */
export default function XmlComponentsPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">
                    Components
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Reusable UI components and bridge tags for XML pages.</P>
            </section>

            <section className="space-y-4">
                <Heading id="avatar" level="h2" className="text-foreground">
                    Avatar
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Avatar size="sm"><AvatarImage /><AvatarFallback>AL</AvatarFallback></Avatar>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="badge" level="h2" className="text-foreground">
                    Badge
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Badge variant="secondary">New</Badge>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="text" level="h2" className="text-foreground">
                    Text
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Renders inline text content and formatting.</P>
                <Ul className="text-muted-foreground">
                    <Li>
                        <Code>A</Code> links to another page or resource.
                    </Li>
                    <Li>
                        <Code>B</Code> renders bold inline text.
                    </Li>
                    <Li>
                        <Code>Code</Code> renders inline monospace text.
                    </Li>
                    <Li>
                        <Code>S</Code> renders strikethrough text.
                    </Li>
                    <Li>
                        <Code>Sub</Code> renders subscript text.
                    </Li>
                    <Li>
                        <Code>Sup</Code> renders superscript text.
                    </Li>
                    <Li>
                        <Code>P</Code> renders a standard paragraph.
                    </Li>
                    <Li>
                        <Code>U</Code> renders underlined text.
                    </Li>
                </Ul>
                <Window>{`<P>
                <A href="/settings">Open settings</A> 
                <B>Important</B> 
                <Code>@radix-ui/react-alert-dialog</Code> <S>Deprecated</S> <Sub>n</Sub> <Sup>2</Sup> <U>Underlined</U></P>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="title" level="h2" className="text-foreground">
                    Title
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Renders page title levels.</P>
                <Ul className="text-muted-foreground">
                    <Li>
                        <Code>H1</Code> primary heading for a page.
                    </Li>
                    <Li>
                        <Code>H2</Code> second-level heading.
                    </Li>
                    <Li>
                        <Code>H3</Code> third-level heading.
                    </Li>
                    <Li>
                        <Code>H4</Code> fourth-level heading.
                    </Li>
                </Ul>
                <Window>{`<H1>Dashboard</H1>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="lists" level="h2" className="text-foreground">
                    Lists
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Renders ordered and unordered lists.</P>
                <Ul className="text-muted-foreground">
                    <Li>
                        <Code>Ol</Code> renders an ordered list.
                    </Li>
                    <Li>
                        <Code>Ul</Code> renders an unordered list.
                    </Li>
                    <Li>
                        <Code>Li</Code> renders a list item inside <Code>Ol</Code> or <Code>Ul</Code>.
                    </Li>
                </Ul>
                <Window>{`<Ol><Li>First item</Li><Li>Second item</Li></Ol>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="buttons" level="h2" className="text-foreground">
                    Buttons
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Ul className="text-muted-foreground">
                    <Li>
                        <Code>Button</Code> renders a single action.
                    </Li>
                    <Li>
                        <Code>ButtonGroup</Code> arranges related buttons.
                    </Li>
                </Ul>
                <Window>{`<Button>Create issue</Button>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="hr" level="h2" className="text-foreground">
                    Hr
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Ul className="text-muted-foreground">
                    <Li>
                        <Code>Hr</Code> renders a visual separator.
                    </Li>
                    <Li>
                        <Code>Br</Code> renders a line break for visual separation.
                    </Li>
                </Ul>
                <Window>{`<Hr /><Br />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="hero" level="h2" className="text-foreground">
                    Hero
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Hero icon="layout-grid">Browse organizations</Hero>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="icon" level="h2" className="text-foreground">
                    Icon
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Icon name="layout-grid" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="table" level="h2" className="text-foreground">
                    Table
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Table><Thead /><Tbody /></Table>`}</Window>
            </section>
        </article>
    );
}
