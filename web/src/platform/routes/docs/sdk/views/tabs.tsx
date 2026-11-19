import ViewLayout from './view-layout';
import { Tabs } from '@/components/longlink';

/** Documents native tab composition and selection. */
export default function TabsPage() {
    // Describe the installed components without imposing selection policies.
    return (
        <ViewLayout
            name="Tabs"
            example={{
                title: 'Tabs',
                preview: <TabsExample />,
                code: `function Example() {
  return (
    <Tabs defaultValue="overview" items={[
      { value: 'overview', label: 'Overview', content: <Text>Overview content</Text> },
      { value: 'activity', label: 'Activity', content: <Text>Activity content</Text> }
    ]} />
  );
}`
            }}
        />
    );
}

/** Demonstrates independently selectable panels. */
function TabsExample() {
    // Let the native tabs manage selection.
    return (
        <Tabs
            defaultValue="overview"
            items={[
                { value: 'overview', label: 'Overview', content: <span>Overview content</span> },
                { value: 'activity', label: 'Activity', content: <span>Activity content</span> }
            ]}
        />
    );
}
