import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-06',
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
                Columns and Column
            </Heading>
            <P>
                Creates a responsive horizontal layout from immediate Column children. Widths are relative, so sibling
                widths should usually add up to 100.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>Columns: no parameters.</Li>
                    <Li>Column width: optional relative width. Defaults to 100 when omitted.</Li>
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
                    <Li>columns: optional number of equal columns or a CSS grid-template-columns value.</Li>
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
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>No parameters.</Li>
                </Ul>
            </Stack>
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
                    <Li>space: optional center, around, evenly, or between.</Li>
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
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>size: optional card spacing size. Defaults to default.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Card size="sm">
  ...
</Card>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="hero" level="h2">
                Hero
            </Heading>
            <P>Creates a prominent page introduction with optional icon, title, description, and action slots.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>Hero icon: optional Lucide icon name rendered near the title.</Li>
                    <Li>HeroTitle i18n: optional translation key for localized title text.</Li>
                    <Li>HeroDescription i18n: optional translation key for localized description text.</Li>
                    <Li>HeroAction: no parameters. Place buttons or links inside it.</Li>
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
                Tabs and Tab
            </Heading>
            <P>
                Switches between related panels collected from immediate Tab children. A Tab can also render its
                children directly when used outside Tabs.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>Tabs defaultValue: optional initially selected tab value.</Li>
                    <Li>Tab value: required inside Tabs.</Li>
                    <Li>Tab label or i18n: required inside Tabs for trigger text.</Li>
                    <Li>Tab icon: optional Lucide icon name.</Li>
                    <Li>Tab if: optional condition to hide the tab.</Li>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        Dialog open: optional controlled open state expression. Omit it for trigger-managed dialogs.
                    </Li>
                    <Li>
                        DialogTrigger: no parameters. Single Button or A children are wired as the trigger element.
                    </Li>
                    <Li>DialogContent, DialogTitle, and DialogDescription: no parameters.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Dialog>
  <DialogTrigger>
    ...
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>...</DialogTitle>
    <DialogDescription>...</DialogDescription>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>Menu defaultValue: optional initial section value.</Li>
                    <Li>Menu value: optional controlled active section value.</Li>
                    <Li>MenuSection value: required section id.</Li>
                    <Li>MenuSection label or i18n: optional visible label.</Li>
                    <Li>MenuSection icon: optional Lucide icon name.</Li>
                    <Li>MenuSection disabled: optional boolean.</Li>
                    <Li>MenuSubSection value: required subsection id.</Li>
                    <Li>MenuSubSection label or i18n: optional visible label.</Li>
                    <Li>MenuSubSection disabled: optional boolean.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Menu defaultValue="overview">
  <MenuSection value="overview" label="Overview" icon="layout-grid">
    ...
  </MenuSection>
  <MenuSection value="orders" label="Orders" icon="clipboard-list">
    <MenuSubSection value="open" label="Open orders">
      ...
    </MenuSubSection>
  </MenuSection>
</Menu>`}</CodeBlock>
        </Stack>
    </Stack>
);
