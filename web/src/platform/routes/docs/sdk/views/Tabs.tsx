import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Tabs, Tab } from '@/components/ui/Tabs';

/** Documents tab selection and panel content. */
export default function TabsPage() {
    // Render tab selection guidance with separate Tabs and Tab property tables.
    return (
        <ViewLayout
            name="Tabs"
            introduction="Tabs is a LongLink component that displays a tab strip and the selected Tab’s content."
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
