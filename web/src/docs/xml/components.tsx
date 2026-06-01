import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/xml/components.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Components</H1>
    <P>Reusable UI components and bridge tags for XML pages.</P>
    <H2>Avatar</H2>
    <P>Avatar renders user or record imagery with fallback and badge slots.</P>
    <Pre lang="xml"><![CDATA[<Avatar size="lg">
  <AvatarImage src="https://ex.com/a.png" alt="LongLink" />
  <AvatarFallback>LL</AvatarFallback>
</Avatar>]]></Pre>
    <H2>Badge</H2>
    <P>Badge renders compact status or count labels.</P>
    <Pre lang="xml"><![CDATA[<Flex space="around">
  <Badge>Default</Badge>
  <Badge variant="outline">Outline</Badge>
  <Badge variant="ghost">Ghost</Badge>
  <Badge variant="destructive">Alert</Badge>
  <Badge variant="link">Link</Badge>
</Flex>]]></Pre>
    <H2>Buttons</H2>
    <P>Buttons trigger actions or navigation.</P>
    <Ul>
      <Li><Code>Button</Code> renders a single action.</Li>
      <Li><Code>ButtonGroup</Code> arranges related buttons.</Li>
      <Li>Supported variants include <Code>default</Code>, <Code>outline</Code>, <Code>ghost</Code>, <Code>destructive</Code>, and <Code>link</Code>.</Li>
    </Ul>
    <Pre lang="xml"><![CDATA[<Flex space="around">
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
</Flex>]]></Pre>
    <H2>Hr</H2>
    <P><Code>Hr</Code> renders a visual separator and <Code>Br</Code> inserts vertical spacing.</P>
    <Pre lang="xml"><![CDATA[<Hr />
<Br />]]></Pre>
    <H2>Hero</H2>
    <P>Hero renders a prominent introductory section with optional actions.</P>
    <Pre lang="xml"><![CDATA[<Hero icon="layout-grid">
  <HeroTitle>Browse orgs</HeroTitle>
  <HeroDescription>Manage the workspaces connected to your account.</HeroDescription>
  <HeroAction>
    <Button>New Org</Button>
  </HeroAction>
</Hero>]]></Pre>
    <H2>Icon</H2>
    <P>Icon renders a Lucide icon by XML name.</P>
    <Pre lang="xml"><![CDATA[<Grid columns="4">
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
</Grid>]]></Pre>
    <H2>Input</H2>
    <P>Use <Code>Input</Code> inside <Code>Field</Code> when the input needs a label and description.</P>
    <Pre lang="xml"><![CDATA[<Field>
  <FieldLabel htmlFor="name">
    <FieldTitle>Full name</FieldTitle>
    <FieldDescription>Use the name shown to other members.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Input id="name" />
  </FieldContent>
</Field>]]></Pre>
    <H2>Lists</H2>
    <P>Lists render ordered and unordered lists.</P>
    <Ul>
      <Li><Code>Ol</Code> renders an ordered list.</Li>
      <Li><Code>Ul</Code> renders an unordered list.</Li>
      <Li><Code>Li</Code> renders a list item inside <Code>Ol</Code> or <Code>Ul</Code>.</Li>
    </Ul>
    <Pre lang="xml"><![CDATA[<Ol>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ol>]]></Pre>
    <H2>RadioGroup</H2>
    <P>Use <Code>RadioGroup</Code> for mutually exclusive options and label the group clearly.</P>
    <Pre lang="xml"><![CDATA[<Field>
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
</Field>]]></Pre>
    <H2>Select</H2>
    <P>Use <Code>Select</Code> for single-choice dropdowns with a title and description.</P>
    <Pre lang="xml"><![CDATA[<Field>
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
</Field>]]></Pre>
    <H2>Slider</H2>
    <P>Use <Code>Slider</Code> for numeric ranges and step-based input.</P>
    <Pre lang="xml"><![CDATA[<Field>
  <FieldLabel htmlFor="budget">
    <FieldTitle>Budget</FieldTitle>
    <FieldDescription>Adjust the spending cap for this project.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Slider id="budget" min="0" max="100" step="5" value="50" />
  </FieldContent>
</Field>]]></Pre>
    <H2>Switch</H2>
    <P>Use <Code>Switch</Code> for on/off settings with an explicit title and description.</P>
    <Pre lang="xml"><![CDATA[<Field>
  <FieldLabel>
    <Switch id="notifications" />
    <FieldTitle>Email notifications</FieldTitle>
  </FieldLabel>
  <FieldContent>
    <FieldDescription>Get an email when someone mentions you.</FieldDescription>
  </FieldContent>
</Field>]]></Pre>
    <H2>Table</H2>
    <P>Table renders structured tabular content.</P>
    <Pre lang="xml"><![CDATA[<Table>
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
</Table>]]></Pre>
    <H2>Text</H2>
    <P>Text renders inline text content and formatting.</P>
    <Ul>
      <Li><Code>A</Code> links to another page or resource.</Li>
      <Li><Code>B</Code> renders bold inline text.</Li>
      <Li><Code>Code</Code> renders inline monospace text.</Li>
      <Li><Code>S</Code> renders strikethrough text.</Li>
      <Li><Code>Sub</Code> renders subscript text.</Li>
      <Li><Code>Sup</Code> renders superscript text.</Li>
      <Li><Code>P</Code> renders a standard paragraph.</Li>
      <Li><Code>U</Code> renders underlined text.</Li>
    </Ul>
    <Pre lang="xml"><![CDATA[<P>
  <A href="/settings">Open settings</A>
  <B>Important</B>
  <Code>@radix-ui/react-alert-dialog</Code>
  <S>Deprecated</S>
  <Sub>n</Sub>
  <Sup>2</Sup>
  <U>Underlined</U>
</P>]]></Pre>
    <H2>Textarea</H2>
    <P>Use <Code>Textarea</Code> for longer text entry and keep it inside a complete field block.</P>
    <Pre lang="xml"><![CDATA[<Field>
  <FieldLabel htmlFor="notes">
    <FieldTitle>Notes</FieldTitle>
    <FieldDescription>Add context for the next reviewer.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Textarea id="notes" rows="4" />
  </FieldContent>
</Field>]]></Pre>
    <H2>Toggle</H2>
    <P>Use <Code>Toggle</Code> for a single pressed state with supporting field text.</P>
    <Pre lang="xml"><![CDATA[<Field>
  <FieldLabel htmlFor="enabled">
    <FieldTitle>Enabled</FieldTitle>
    <FieldDescription>Turn this feature on for everyone.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Toggle pressed="settings.enabled" id="enabled" size="sm">Enabled</Toggle>
  </FieldContent>
</Field>]]></Pre>
    <H2>ToggleGroup</H2>
    <P>Use <Code>ToggleGroup</Code> for related toggle choices and show the group label above it.</P>
    <Pre lang="xml"><![CDATA[<Field>
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
</Field>]]></Pre>
    <H2>Title</H2>
    <P>Title renders page title levels.</P>
    <Ul>
      <Li><Code>H1</Code> primary heading for a page.</Li>
      <Li><Code>H2</Code> second-level heading.</Li>
      <Li><Code>H3</Code> third-level heading.</Li>
      <Li><Code>H4</Code> fourth-level heading.</Li>
    </Ul>
    <Pre lang="xml"><![CDATA[<H1>Dashboard</H1>]]></Pre>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;
