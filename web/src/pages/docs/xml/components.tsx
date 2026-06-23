import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/xml/components.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="components" level="h1">
            Components
        </Heading>
        <p className="leading-7">Reusable UI components and bridge tags for XML pages.</p>
        <Heading id="avatar" level="h2">
            Avatar
        </Heading>
        <p className="leading-7">Avatar renders user or record imagery with fallback and badge slots.</p>
        <CodeBlock language="xml">{`<Avatar size="lg">
  <AvatarImage src="https://ex.com/a.png" alt="LongLink" />
  <AvatarFallback>LL</AvatarFallback>
</Avatar>`}</CodeBlock>
        <Heading id="badge" level="h2">
            Badge
        </Heading>
        <p className="leading-7">Badge renders compact status or count labels.</p>
        <CodeBlock language="xml">{`<Flex space="around">
  <Badge>Default</Badge>
  <Badge variant="outline">Outline</Badge>
  <Badge variant="ghost">Ghost</Badge>
  <Badge variant="destructive">Alert</Badge>
  <Badge variant="link">Link</Badge>
</Flex>`}</CodeBlock>
        <Heading id="buttons" level="h2">
            Buttons
        </Heading>
        <p className="leading-7">Buttons trigger actions or navigation.</p>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Button</code>{' '}
                renders a single action.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">ButtonGroup</code>{' '}
                arranges related buttons.
            </li>
            <li>
                Supported variants include{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">default</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">outline</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">ghost</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">destructive</code>
                , and <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">link</code>.
            </li>
        </ul>
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
        <Heading id="hr" level="h2">
            Hr
        </Heading>
        <p className="leading-7">
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Hr</code> renders a
            visual separator and{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Br</code> inserts
            vertical spacing.
        </p>
        <CodeBlock language="xml">{`<Hr />
<Br />`}</CodeBlock>
        <Heading id="hero" level="h2">
            Hero
        </Heading>
        <p className="leading-7">Hero renders a prominent introductory section with optional actions.</p>
        <CodeBlock language="xml">{`<Hero icon="layout-grid">
  <HeroTitle>Browse orgs</HeroTitle>
  <HeroDescription>Manage the workspaces connected to your account.</HeroDescription>
  <HeroAction>
    <Button>New Org</Button>
  </HeroAction>
</Hero>`}</CodeBlock>
        <Heading id="icon" level="h2">
            Icon
        </Heading>
        <p className="leading-7">Icon renders a Lucide icon by XML name.</p>
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
        <Heading id="input" level="h2">
            Input
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Input</code>{' '}
            inside <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Field</code>{' '}
            when the input needs a label and description.
        </p>
        <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="name">
    <FieldTitle>Full name</FieldTitle>
    <FieldDescription>Use the name shown to other members.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Input id="name" />
  </FieldContent>
</Field>`}</CodeBlock>
        <Heading id="lists" level="h2">
            Lists
        </Heading>
        <p className="leading-7">Lists render ordered and unordered lists.</p>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Ol</code> renders
                an ordered list.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Ul</code> renders
                an unordered list.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Li</code> renders
                a list item inside{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Ol</code> or{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Ul</code>.
            </li>
        </ul>
        <CodeBlock language="xml">{`<Ol>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ol>`}</CodeBlock>
        <Heading id="radiogroup" level="h2">
            RadioGroup
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">RadioGroup</code>{' '}
            for mutually exclusive options and label the group clearly.
        </p>
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
        <Heading id="select" level="h2">
            Select
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Select</code> for
            single-choice dropdowns with a title and description.
        </p>
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
        <Heading id="slider" level="h2">
            Slider
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Slider</code> for
            numeric ranges and step-based input.
        </p>
        <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="budget">
    <FieldTitle>Budget</FieldTitle>
    <FieldDescription>Adjust the spending cap for this project.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Slider id="budget" min="0" max="100" step="5" value="50" />
  </FieldContent>
</Field>`}</CodeBlock>
        <Heading id="switch" level="h2">
            Switch
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Switch</code> for
            on/off settings with an explicit title and description.
        </p>
        <CodeBlock language="xml">{`<Field>
  <FieldLabel>
    <Switch id="notifications" />
    <FieldTitle>Email notifications</FieldTitle>
  </FieldLabel>
  <FieldContent>
    <FieldDescription>Get an email when someone mentions you.</FieldDescription>
  </FieldContent>
</Field>`}</CodeBlock>
        <Heading id="table" level="h2">
            Table
        </Heading>
        <p className="leading-7">Table renders structured tabular content.</p>
        <CodeBlock language="xml">{`<Table>
  <Thead>
    <Tr>
      <Th>Name</Th>
      <Th>Status</Th>
      <Th>Owner</Th>
    </Tr>
  </Thead>
  <Tbody>
    <Tr>
      <Td>Alpha</Td>
      <Td>Active</Td>
      <Td>Sam</Td>
    </Tr>
    <Tr>
      <Td>Beta</Td>
      <Td>Paused</Td>
      <Td>Lee</Td>
    </Tr>
  </Tbody>
</Table>`}</CodeBlock>
        <Heading id="text" level="h2">
            Text
        </Heading>
        <p className="leading-7">Text renders inline text content and formatting.</p>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">A</code> links to
                another page or resource.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">B</code> renders
                bold inline text.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Code</code>{' '}
                renders inline monospace text.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">S</code> renders
                strikethrough text.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Sub</code> renders
                subscript text.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Sup</code> renders
                superscript text.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">P</code> renders a
                standard paragraph.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">U</code> renders
                underlined text.
            </li>
        </ul>
        <CodeBlock language="xml">{`<P>
  <A href="/settings">Open settings</A>
  <B>Important</B>
  <Code>@radix-ui/react-alert-dialog</Code>
  <S>Deprecated</S>
  <Sub>n</Sub>
  <Sup>2</Sup>
  <U>Underlined</U>
</P>`}</CodeBlock>
        <Heading id="textarea" level="h2">
            Textarea
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Textarea</code>{' '}
            for longer text entry and keep it inside a complete field block.
        </p>
        <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="notes">
    <FieldTitle>Notes</FieldTitle>
    <FieldDescription>Add context for the next reviewer.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Textarea id="notes" rows="4" />
  </FieldContent>
</Field>`}</CodeBlock>
        <Heading id="toggle" level="h2">
            Toggle
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Toggle</code> for
            a single pressed state with supporting field text.
        </p>
        <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="enabled">
    <FieldTitle>Enabled</FieldTitle>
    <FieldDescription>Turn this feature on for everyone.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Toggle pressed="settings.enabled" id="enabled" size="sm">Enabled</Toggle>
  </FieldContent>
</Field>`}</CodeBlock>
        <Heading id="togglegroup" level="h2">
            ToggleGroup
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">ToggleGroup</code>{' '}
            for related toggle choices and show the group label above it.
        </p>
        <CodeBlock language="xml">{`<Field>
  <FieldLegend>
    <FieldTitle>Text alignment</FieldTitle>
    <FieldDescription>Choose how the content should align.</FieldDescription>
  </FieldLegend>
  <FieldContent>
    <ToggleGroup type="single">
      <ToggleGroupItem value="left">Left</ToggleGroupItem>
      <ToggleGroupItem value="center">Center</ToggleGroupItem>
      <ToggleGroupItem value="right">Right</ToggleGroupItem>
    </ToggleGroup>
  </FieldContent>
</Field>`}</CodeBlock>
        <Heading id="title" level="h2">
            Title
        </Heading>
        <p className="leading-7">Title renders page title levels.</p>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">H1</code> primary
                heading for a page.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">H2</code>{' '}
                second-level heading.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">H3</code>{' '}
                third-level heading.
            </li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">H4</code>{' '}
                fourth-level heading.
            </li>
        </ul>
        <CodeBlock language="xml">{`<H1>Dashboard</H1>`}</CodeBlock>
    </div>
);
