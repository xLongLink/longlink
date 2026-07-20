import { P } from '@/components/ui/p';
import { Li } from '@/components/ui/li';
import { Ul } from '@/components/ui/ul';
import { Code } from '@/components/ui/code';
import { Stack } from '@/components/ui/stack';
import { Heading } from '@/components/ui/heading';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/layout.tsx',
};

export const content = (
    <Stack>
        <Heading id="layout" level="h1">
            Layout
        </Heading>
        <P>Layout elements organize XML page content into responsive sections, cards, dialogs, tabs, and menus.</P>
        <Stack className="gap-3">
            <Heading id="columns" level="h2">
                Columns
            </Heading>
            <P>
                Creates a responsive horizontal layout from immediate Column children. Widths are relative, so sibling
                widths should usually add up to 100.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Column Parameters</P>
                <Ul>
                    <Li>
                        <Code>width</Code>: optional relative width. Defaults to <Code>100</Code> when omitted.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Columns>
  <Column width="70">...</Column>
  <Column width="30">...</Column>
</Columns>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="grid" level="h2">
                Grid
            </Heading>
            <P>Arranges children in equal columns or a custom CSS grid template.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>columns</Code>: optional number of equal columns or a CSS{' '}
                        <Code>grid-template-columns</Code> value.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Grid columns="3">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</Grid>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="stack" level="h2">
                Stack
            </Heading>
            <P>Stacks child elements vertically with consistent spacing.</P>
            <CodeBlock language="xml">{`<Stack>
  ...
  ...
</Stack>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="flex" level="h2">
                Flex
            </Heading>
            <P>Places children in a row and controls horizontal distribution.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>space</Code>: optional <Code>center</Code>, <Code>around</Code>, <Code>evenly</Code>, or{' '}
                        <Code>between</Code>.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Flex space="between">
  ...
  ...
</Flex>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="card" level="h2">
                Card
            </Heading>
            <P>Groups related content in a bordered card surface.</P>
            <CodeBlock language="xml">{`<Card>
  ...
</Card>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="hero" level="h2">
                Hero
            </Heading>
            <P>Creates a prominent page introduction with optional icon, title, description, and action slots.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Hero Parameters</P>
                <Ul>
                    <Li>
                        <Code>icon</Code>: optional Lucide icon name rendered near the title.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Hero icon="layout-grid">
  <HeroTitle i18n="..." />
  <HeroDescription i18n="..." />
  <HeroAction>
    ...
  </HeroAction>
</Hero>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="tabs" level="h2">
                Tabs
            </Heading>
            <P>
                Switches between related panels collected from immediate Tab children. A Tab can also render its
                children directly when used outside Tabs.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Tabs Parameters</P>
                <Ul>
                    <Li>
                        <Code>defaultValue</Code>: optional initially selected tab value.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Tab Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: required inside Tabs.
                    </Li>
                    <Li>
                        <Code>label</Code>: optional trigger text.
                    </Li>
                    <Li>
                        <Code>icon</Code>: optional Lucide icon name.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Tabs defaultValue="overview">
  <Tab value="overview" i18n="...">
    ...
  </Tab>
  <Tab value="activity" i18n="..." icon="list">
    ...
  </Tab>
</Tabs>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="dialog" level="h2">
                Dialog
            </Heading>
            <P>
                Creates an overlay dialog for focused actions and confirmations. DialogTrigger opens the dialog,
                DialogContent renders the panel, and DialogTitle plus DialogDescription provide accessible text.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Dialog Parameters</P>
                <Ul>
                    <Li>
                        <Code>open</Code>: optional controlled open state expression. Omit it for trigger-managed
                        dialogs.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Dialog>
  <DialogTrigger>
    ...
  </DialogTrigger>
  <DialogContent>
    <DialogTitle i18n="..." />
    <DialogDescription i18n="..." />
  </DialogContent>
</Dialog>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="menu" level="h2">
                Menu
            </Heading>
            <P>
                Creates sectioned navigation where each MenuSection owns a content panel. MenuSubSection defines nested
                selectable panels inside a MenuSection.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Menu Parameters</P>
                <Ul>
                    <Li>
                        <Code>defaultValue</Code>: optional initial section value.
                    </Li>
                    <Li>
                        <Code>value</Code>: optional controlled active section value.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">MenuSection Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: required section id.
                    </Li>
                    <Li>
                        <Code>label</Code>: optional visible label.
                    </Li>
                    <Li>
                        <Code>icon</Code>: optional Lucide icon name.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">MenuSubSection Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: required subsection id.
                    </Li>
                    <Li>
                        <Code>label</Code>: optional visible label.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Menu defaultValue="overview">
  <MenuSection value="overview" i18n="..." icon="layout-grid">
    ...
  </MenuSection>
  <MenuSection value="orders" i18n="..." icon="clipboard-list">
    <MenuSubSection value="open" i18n="...">
      ...
    </MenuSubSection>
  </MenuSection>
</Menu>`}</CodeBlock>
        </Stack>
    </Stack>
);
