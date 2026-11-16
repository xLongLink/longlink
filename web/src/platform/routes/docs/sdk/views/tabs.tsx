import ViewLayout from './view-layout';
import { Tabs, Tab } from '@/components/longlink/layout/tabs';

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
                { name: 'Tab.value', type: 'string' },
                { name: 'Tab.label', type: 'ReactNode' },
                { name: 'Tab.disabled', type: 'boolean' },
                { name: 'Tab.keepMounted', type: 'boolean' },
                { name: 'Tab.children', type: 'ReactNode' }
            ]}
            example={{
                title: 'Tabs',
                preview: <TabsExample />,
                code: `function Example() {
  return (
    <Tabs defaultValue="overview">
      <Tab value="overview" label="Overview">
        <Text>Overview content</Text>
      </Tab>
      <Tab value="activity" label="Activity">
        <Text>Activity content</Text>
      </Tab>
    </Tabs>
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
        <Tabs defaultValue="overview">
            <Tab value="overview" label="Overview">
                <span>Overview content</span>
            </Tab>
            <Tab value="activity" label="Activity">
                <span>Activity content</span>
            </Tab>
        </Tabs>
    );
}
