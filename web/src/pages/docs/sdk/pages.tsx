import { useState, type ReactNode } from 'react';

import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PageSection = 'layout' | 'components';

export const PAGE_SECTION_OPTIONS: Array<{ label: string; value: PageSection }> = [
    { label: 'Layout', value: 'layout' },
    { label: 'Components', value: 'components' },
];

export const PAGE_SECTION_CONTENT: Record<PageSection, ReactNode> = {
    layout: (
        <div className="flex flex-col gap-4">
            <Heading id="layout" level="h2">
                Layout
            </Heading>
            <p className="leading-7">Page layout components organize content into responsive sections and dialogs.</p>
            <CodeBlock language="xml">{`<Card size="sm">
  <P>Card Content</P>
</Card>`}</CodeBlock>
            <CodeBlock language="xml">{`<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>`}</CodeBlock>
            <CodeBlock language="xml">{`<Dialog>
  <DialogTrigger>
    <Button variant="outline">Open dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Delete issue</DialogTitle>
    <DialogDescription>This cannot be undone.</DialogDescription>
  </DialogContent>
</Dialog>`}</CodeBlock>
            <CodeBlock language="xml">{`<Flex space="between">
  <Button variant="outline">Cancel</Button>

  <ButtonGroup>
    <Button size="sm" variant="outline">Back</Button>
    <Button size="sm">Next</Button>
  </ButtonGroup>
</Flex>`}</CodeBlock>
            <CodeBlock language="xml">{`<Grid columns="3">
  <Card>One</Card>
  <Card>Two</Card>
  <Card>Three</Card>
</Grid>`}</CodeBlock>
            <CodeBlock language="xml">{`<Menu defaultValue="settings">
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
</Menu>`}</CodeBlock>
            <CodeBlock language="xml">{`<Stack>
  <P>First</P>
  <P>Second</P>
</Stack>`}</CodeBlock>
            <CodeBlock language="xml">{`<Tabs defaultValue="overview">
  <Tab value="overview" label="Overview">
    <P>Overview content</P>
  </Tab>
  <Tab value="settings" label="Settings">
    <P>Settings content</P>
  </Tab>
</Tabs>`}</CodeBlock>
        </div>
    ),
    components: (
        <div className="flex flex-col gap-4">
            <Heading id="components" level="h2">
                Components
            </Heading>
            <p className="leading-7">Reusable UI components and bridge tags for pages.</p>
            <CodeBlock language="xml">{`<Avatar size="lg">
  <AvatarImage src="https://ex.com/a.png" alt="LongLink" />
  <AvatarFallback>LL</AvatarFallback>
</Avatar>`}</CodeBlock>
            <CodeBlock language="xml">{`<Flex space="around">
  <Badge>Default</Badge>
  <Badge variant="outline">Outline</Badge>
  <Badge variant="ghost">Ghost</Badge>
  <Badge variant="destructive">Alert</Badge>
  <Badge variant="link">Link</Badge>
</Flex>`}</CodeBlock>
            <CodeBlock language="xml">{`<Flex space="around">
  <Button>Create issue</Button>
  <Button variant="outline">Preview</Button>
  <Button variant="ghost">Skip</Button>
  <Button variant="destructive">Delete</Button>
  <Button variant="link">Learn more</Button>
</Flex>

<Flex space="center">
  <ButtonGroup>
    <Button size="sm" variant="outline">Cancel</Button>
    <Button size="sm">Save draft</Button>
    <Button size="sm">Publish</Button>
  </ButtonGroup>
</Flex>`}</CodeBlock>
            <CodeBlock language="xml">{`<Hr />
<Br />`}</CodeBlock>
            <CodeBlock language="xml">{`<Hero icon="layout-grid">
  <HeroTitle>Browse orgs</HeroTitle>
  <HeroDescription>Manage the workspaces connected to your account.</HeroDescription>
  <HeroAction>
    <Button>New Org</Button>
  </HeroAction>
</Hero>`}</CodeBlock>
            <CodeBlock language="xml">{`<Grid columns="4">
  <Icon name="layout-grid" />
  <Icon name="search" />
  <Icon name="settings" />
  <Icon name="bell" />
  <Icon name="mail" />
  <Icon name="user" />
  <Icon name="shield" />
  <Icon name="sparkles" />
  <Icon name="camera" />
  <Icon name="calendar" />
  <Icon name="link" />
  <Icon name="arrow-right" />
  <Icon name="check" />
  <Icon name="copy" />
  <Icon name="upload" />
  <Icon name="download" />
</Grid>`}</CodeBlock>
            <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="name">
    <FieldTitle>Full name</FieldTitle>
    <FieldDescription>Use the name shown to other members.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Input id="name" />
  </FieldContent>
</Field>`}</CodeBlock>
            <CodeBlock language="xml">{`<Ol>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ol>`}</CodeBlock>
            <CodeBlock language="xml">{`<Field>
  <FieldLegend>
    <FieldTitle>Priority</FieldTitle>
    <FieldDescription>Choose how urgently this should be handled.</FieldDescription>
  </FieldLegend>
  <FieldContent>
    <RadioGroup name="priority" defaultValue="medium">
      <RadioGroupItem value="low">Low</RadioGroupItem>
      <RadioGroupItem value="medium">Medium</RadioGroupItem>
      <RadioGroupItem value="high">High</RadioGroupItem>
    </RadioGroup>
  </FieldContent>
</Field>`}</CodeBlock>
            <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="department">
    <FieldTitle>Department</FieldTitle>
    <FieldDescription>Pick the team this person belongs to.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Select id="department" defaultValue="design">
      <SelectTrigger>
        <SelectValue placeholder="Choose department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="design">Design</SelectItem>
        <SelectItem value="engineering">Engineering</SelectItem>
      </SelectContent>
    </Select>
  </FieldContent>
</Field>`}</CodeBlock>
            <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="budget">
    <FieldTitle>Budget</FieldTitle>
    <FieldDescription>Adjust the spending cap for this project.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Slider id="budget" min="0" max="100" step="5" value="50" />
  </FieldContent>
</Field>`}</CodeBlock>
            <CodeBlock language="xml">{`<Field>
  <FieldLabel>
    <Switch id="notifications" />
    <FieldTitle>Email notifications</FieldTitle>
  </FieldLabel>
  <FieldContent>
    <FieldDescription>Get an email when someone mentions you.</FieldDescription>
  </FieldContent>
</Field>`}</CodeBlock>
            <CodeBlock language="xml">{`<Table>
  <Thead>
    <Tr>
      <Th>Name</Th>
      <Th>Status</Th>
    </Tr>
  </Thead>
  <Tbody>
    <Tr>
      <Td>Alpha</Td>
      <Td>Active</Td>
    </Tr>
  </Tbody>
</Table>`}</CodeBlock>
        </div>
    ),
};

/** Renders the SDK Pages documentation with a section dropdown. */
function PagesContent() {
    const [section, setSection] = useState<PageSection>('layout');

    // Keep the visible content aligned with the dropdown selection.
    return (
        <div className="flex flex-col gap-4">
            <Heading id="pages" level="h1">
                Pages
            </Heading>
            <p className="leading-7">
                Pages define the UI for application workflows, from structured layout shells to reusable components.
            </p>
            <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Section</p>
                <Select value={section} onValueChange={(value) => setSection((value ?? 'layout') as PageSection)}>
                    <SelectTrigger className="w-full sm:w-72">
                        <SelectValue placeholder="Choose a section" />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SECTION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {PAGE_SECTION_CONTENT[section]}
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-06-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/pages.tsx',
};

export const content = <PagesContent />;
