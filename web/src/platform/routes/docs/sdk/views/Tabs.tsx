import { Text } from '@astryxdesign/core/Text';
import { Tabs, Tab } from '@/components/ui/Tabs';
import ViewLayout, { type ViewProperties } from './ViewLayout';

// Document the tab strip and its content definitions as separate contracts.
const properties: ViewProperties = [
    {
        name: 'Tabs',
        properties: [
            { name: 'children', type: 'ReactNode', description: 'Tab elements defining labels and panel content.' },
            {
                name: 'gap',
                type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                description: 'Spacing between the tab strip and panel, and within panel content. Defaults to 3.',
            },
            {
                name: 'hasDivider',
                type: 'boolean',
                description: 'Shows a divider beneath the tab strip. Defaults to false.',
            },
            {
                name: 'value',
                type: 'string',
                description: 'Selected Tab value. Omit for internal selection; missing values select the first Tab.',
            },
            {
                name: 'onChange',
                type: '(value: string) => void',
                description: 'Receives the selected Tab value. Use with value to control selection.',
            },
        ],
    },
    {
        name: 'Tab',
        properties: [
            { name: 'value', type: 'string', required: true, description: 'Unique value identifying this tab.' },
            {
                name: 'label',
                type: 'string',
                required: true,
                description: 'Visible tab label and panel accessible name.',
            },
            {
                name: 'children',
                type: 'ReactNode',
                description: 'Panel content mounted only while this tab is selected.',
            },
            { name: 'isDisabled', type: 'boolean', description: 'Prevents users from activating this tab.' },
            {
                name: 'panelId',
                type: 'string',
                description: 'Panel element ID linked to the tab button. Defaults to an automatically generated ID.',
            },
        ],
    },
];

/** Documents tab selection and panel content. */
export default function TabsPage() {
    // Render tab selection guidance with separate Tabs and Tab property tables.
    return (
        <ViewLayout
            name="Tabs"
            properties={properties}
            reference={{
                introduction: 'Tabs is a LongLink component that displays a tab strip and the selected Tab’s content.',
                properties: [],
                practices: [
                    {
                        guidance: true,
                        description:
                            'Give each Tab a unique value. Use value and onChange together when selection must be controlled.',
                    },
                ],
            }}
            examples={[
                {
                    title: 'Tabs',
                    preview: <TabsExample />,
                    code: `function Example() {
  return (
    <Tabs hasDivider>
      <Tab value="overview" label="Overview">
        <Text>Overview content</Text>
      </Tab>
      <Tab value="activity" label="Activity">
        <Text>Activity content</Text>
      </Tab>
    </Tabs>
  );
}`,
                },
            ]}
        />
    );
}

/** Demonstrates the page's tabs with independently selectable panels. */
export function TabsExample() {
    // Let the tabs manage selection and render the active panel.
    return (
        <Tabs>
            <Tab label="Overview" value="overview">
                <Text>Overview content</Text>
            </Tab>
            <Tab label="Activity" value="activity">
                <Text>Activity content</Text>
            </Tab>
        </Tabs>
    );
}
