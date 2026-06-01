import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/xml/layout.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Layout</H1>
    <P>XML layout components organize content into responsive sections and dialog-style surfaces.</P>
    <H2>Card</H2>
    <P>Cards group related content.</P>
    <Pre lang="xml"><![CDATA[<Card size="sm">
  <P>Card Content</P>
</Card>]]></Pre>
    <H2>Columns</H2>
    <P>Columns render side-by-side sections. Column widths should add up to 100 across the row.</P>
    <Pre lang="xml"><![CDATA[<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>]]></Pre>
    <H2>Dialog</H2>
    <P>Dialog renders an overlay for focused actions and confirmations.</P>
    <P>Use a trigger to open the dialog. Use <Code>open</Code> only when you need a controlled dialog.</P>
    <Pre lang="xml"><![CDATA[<Dialog>
  <DialogTrigger>
    <Button variant="outline">Open dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Delete issue</DialogTitle>
    <DialogDescription>This cannot be undone.</DialogDescription>
  </DialogContent>
</Dialog>]]></Pre>
    <H2>Flex</H2>
    <P>Flex arranges children in a row and can distribute space between them.</P>
    <Ul>
      <Li><Code>space="center"</Code> centers the group.</Li>
      <Li><Code>space="around"</Code> adds equal space around each item.</Li>
      <Li><Code>space="between"</Code> pushes items to the edges.</Li>
      <Li><Code>space="evenly"</Code> keeps equal spacing across the row.</Li>
    </Ul>
    <Pre lang="xml"><![CDATA[<Flex space="between">
  <Button variant="outline">Cancel</Button>

  <ButtonGroup>
    <Button size="sm" variant="outline">Back</Button>
    <Button size="sm">Next</Button>
  </ButtonGroup>
</Flex>]]></Pre>
    <H2>Grid</H2>
    <P>Grid renders evenly spaced child cards or panels.</P>
    <Pre lang="xml"><![CDATA[<Grid columns="3">
  <Card>One</Card>
  <Card>Two</Card>
  <Card>Three</Card>
</Grid>]]></Pre>
    <H2>Menu</H2>
    <P>Menus expose sectioned navigation, nested subsections, and optional icons.</P>
    <Pre lang="xml"><![CDATA[<Menu defaultValue="settings">
  <MenuSection value="overview" label="Overview" icon="layout-grid">
    <P>Today's snapshot.</P>
  </MenuSection>

  <MenuSection value="operations" label="Operations" icon="settings">
    <P>Live queue management.</P>

    <MenuSubSection value="orders" label="Orders">
      <P>Open orders waiting on fulfillment.</P>
    </MenuSubSection>
  </MenuSection>

  <MenuSection value="settings" label="Settings" icon="shield">
    <P>Workspace settings and permissions.</P>
  </MenuSection>
</Menu>]]></Pre>
    <H2>Stack</H2>
    <P>Stack arranges content vertically with consistent spacing.</P>
    <Pre lang="xml"><![CDATA[<Stack>
  <P>First</P>
  <P>Second</P>
</Stack>]]></Pre>
    <H2>Tabs</H2>
    <P>Tabs let users switch between related panels. Tabs can also show an icon per tab.</P>
    <Pre lang="xml"><![CDATA[<Tabs defaultValue="overview">
  <Tab value="overview" label="Overview">
    <P>Overview content</P>
  </Tab>
  <Tab value="settings" label="Settings">
    <P>Settings content</P>
  </Tab>
</Tabs>]]></Pre>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;
