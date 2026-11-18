import ViewLayout from './view-layout';
import { Tabs } from '@/components/longlink/layout/tabs';

/** Documents native tab composition and selection. */
export default function TabsPage() {
    // Describe the installed components without imposing selection policies.
    return (
        <ViewLayout
            name="Tabs"
            properties={[
                { name: 'defaultValue', type: 'string' },
                { name: 'value', type: 'string' },
                { name: 'onValueChange', type: '(value: string) => void' },
                { name: 'variant', type: '"default" | "line"' },
                { name: 'items', type: 'readonly TabItem[]' },
                { name: 'items[].value', type: 'string' },
                { name: 'items[].label', type: 'ReactNode' },
                { name: 'items[].disabled', type: 'boolean' },
                { name: 'items[].keepMounted', type: 'boolean' },
                { name: 'items[].content', type: 'ReactNode' }
            ]}
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
