import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Tabs, Tab } from '@/components/ui/Tabs';

/** Documents tab selection and panel content. */
export default function TabsPage() {
    // Render tab selection guidance with separate Tabs and Tab property tables.
    return (
        <ViewLayout
            name="Tabs"
            isLongLinkSpecific
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Tab elements defining labels and panel content.',
                },
                {
                    name: 'gap',
                    type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10',
                },
                {
                    name: 'hasDivider',
                    type: 'boolean',
                },
                {
                    name: 'onChange',
                    type: '(value: string) => void',
                    description: 'Receives the selected Tab value; use with value to control selection.',
                },
                {
                    name: 'value',
                    type: 'string',
                    description: 'Selected Tab value; omit for internal selection, initially choosing the first tab.',
                },
                {
                    name: 'Tab.children',
                    type: 'ReactNode',
                    description: 'Panel content mounted only while this tab is selected.',
                },
                {
                    name: 'Tab.value',
                    type: 'string',
                    description: 'Unique value identifying this tab.',
                },
                {
                    name: 'Tab.label',
                    type: 'string',
                    description: 'Visible tab label and accessible panel name.',
                },
                {
                    name: 'Tab.isDisabled',
                    type: 'boolean',
                    description: 'Whether the tab is disabled.',
                },
            ]}
            introduction="Tabs is a LongLink component that displays a tab strip and the selected Tab’s content."
            example={{
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
            }}
        />
    );
}

/** Demonstrates the page's tabs with independently selectable panels. */
function TabsExample() {
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
