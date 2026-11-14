import ViewLayout from './view-layout';
import { NativeText as Text } from '@/components/custom/native-text';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shadcn/tabs';

/** Documents native tab composition and selection. */
export default function TabsPage() {
    // Describe the installed components without imposing selection policies.
    return (
        <ViewLayout
            name="Tabs"
            properties={[
                {
                    name: 'defaultValue',
                    type: 'unknown',
                    description: 'Initially selected value in uncontrolled mode.'
                },
                { name: 'value', type: 'unknown', description: 'Selected value in controlled mode.' },
                {
                    name: 'onValueChange',
                    type: '(value: unknown, eventDetails: Tabs.Root.ChangeEventDetails) => void',
                    description: 'Called when the selected tab changes.'
                },
                { name: 'orientation', type: '"horizontal" | "vertical"' },
                { name: 'TabsList.variant', type: '"default" | "line"' },
                {
                    name: 'TabsList.activateOnFocus',
                    type: 'boolean',
                    description: 'Select tabs when keyboard focus moves.'
                },
                { name: 'TabsTrigger.value', type: 'unknown', description: 'Value associated with this tab.' },
                { name: 'TabsTrigger.disabled', type: 'boolean' },
                { name: 'TabsTrigger.children', type: 'ReactNode', description: 'Visible tab label.' },
                { name: 'TabsContent.value', type: 'unknown', description: 'Value associated with this panel.' },
                { name: 'TabsContent.keepMounted', type: 'boolean', description: 'Keep an inactive panel in the DOM.' },
                { name: 'TabsContent.children', type: 'ReactNode', description: 'Panel content.' }
            ]}
            example={{
                title: 'Tabs',
                preview: <TabsExample />,
                code: `function Example() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Text>Overview content</Text>
      </TabsContent>
      <TabsContent value="activity">
        <Text>Activity content</Text>
      </TabsContent>
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
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
                <Text>Overview content</Text>
            </TabsContent>
            <TabsContent value="activity">
                <Text>Activity content</Text>
            </TabsContent>
        </Tabs>
    );
}
