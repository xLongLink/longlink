import ViewLayout from './ViewLayout';
import { Text } from '@/components/ui/Text';
import { List, ListItem } from '@/components/ui/List';

/** Documents summary and selection rows with wrapping labels and aligned supporting content. */
export default function ListPage() {
    // Keep summary rows non-interactive unless an explicit action is supplied.
    return (
        <ViewLayout
            name="List"
            isLongLinkSpecific
            introduction="Displays named rows with wrapping labels and optional leading and trailing content. Supply onClick for a keyboard-accessible selection or detail action. Use Table for directories needing column headers."
            properties={[
                { name: 'label', type: 'string', description: 'Required accessible name for the complete list.' },
                { name: 'children', type: 'ReactNode', description: 'ListItem rows.' },
                {
                    name: 'density',
                    type: '"compact" | "balanced" | "spacious"',
                    description: 'Row spacing; defaults to balanced.',
                },
                { name: 'hasDividers', type: 'boolean', description: 'Shows separators between rows.' },
                {
                    name: 'edge',
                    type: '"flush" | "outset"',
                    description:
                        'Flush aligns static rows to their section. Outset adds breathing room inside interaction backgrounds while retaining content alignment. Use inside a padded section. Defaults to flush.',
                },
                {
                    name: 'ListItem.label',
                    type: 'string',
                    description: 'Complete body-sized label; wraps instead of truncating.',
                },
                {
                    name: 'ListItem.description',
                    type: 'string',
                    description: 'Optional wrapping secondary text below the label.',
                },
                {
                    name: 'ListItem.color',
                    type: '"primary" | "secondary"',
                    description: 'Label emphasis; primary by default.',
                },
                {
                    name: 'ListItem.align',
                    type: '"center" | "first-line"',
                    description:
                        'Align leading and trailing content to the row center or its first line. Defaults to first-line.',
                },
                {
                    name: 'ListItem.markerColor',
                    type: '"blue" | "purple" | "green" | "orange" | "pink"',
                    description:
                        'Optional color key matching a Plot series or Distribution segment, placed before leading content.',
                },
                {
                    name: 'ListItem.onClick',
                    type: '() => void',
                    description: 'Enables a keyboard-accessible row action. Omit for read-only rows.',
                },
                {
                    name: 'ListItem.isSelected',
                    type: 'boolean',
                    description: 'Controlled selection state for an interactive row.',
                },
                {
                    name: 'ListItem.startContent',
                    type: 'ReactNode',
                    description: 'Leading icon, rank, or other supporting content.',
                },
                {
                    name: 'ListItem.endContent',
                    type: 'ReactNode',
                    description: 'Trailing value or other supporting content.',
                },
            ]}
            example={{
                title: 'Portfolio summary',
                preview: (
                    <List label="Project statuses">
                        <ListItem
                            label="In progress"
                            description="8 projects"
                            endContent={<Text hasTabularNumbers>66.7%</Text>}
                        />
                        <ListItem
                            label="Completed"
                            description="2 projects"
                            endContent={<Text hasTabularNumbers>16.7%</Text>}
                        />
                    </List>
                ),
                code: `function Example() {
  return (
    <List label="Project statuses">
      <ListItem label="In progress" description="8 projects" endContent={<Text hasTabularNumbers>66.7%</Text>} />
      <ListItem label="Completed" description="2 projects" endContent={<Text hasTabularNumbers>16.7%</Text>} />
    </List>
  );
}`,
            }}
        />
    );
}
