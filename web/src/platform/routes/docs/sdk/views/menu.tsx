import ViewLayout from './view-layout';
import { Menu, Stack } from '@/components/longlink';
import { useLocation, useNavigate } from 'react-router';
import { MenuNavigationContext } from '@/lib/view-capabilities';

/** Documents section navigation and selected content. */
export default function MenuPage() {
    // Render navigation guidance with separate component property tables.
    return (
        <ViewLayout
            name="Menu"
            example={{
                title: 'Menu',
                preview: <MenuExample />,
                code: `function Example() {
  return (
    <Stack padding={4}>
      <Menu sections={[{
        title: 'Settings',
        entries: [
          { kind: 'item', label: 'Profile', icon: 'user-round', content: <Text>Profile settings</Text> },
          {
            kind: 'subsection',
            label: 'Workflow',
            icon: 'wrench',
            items: [
              { label: 'Automation', icon: 'refresh-cw', content: <Text>Automation settings</Text> },
              { label: 'Schedule', icon: 'calendar', content: <Text>Schedule settings</Text> }
            ]
          },
          {
            kind: 'subsection',
            label: 'Workspace',
            icon: 'building-complex',
            items: [
              { label: 'Members', icon: 'users', content: <Text>Workspace members</Text> },
              { label: 'Data', icon: 'database', content: <Text>Workspace data</Text> }
            ]
          }
        ]
      }]} />
    </Stack>
  );
}`
            }}
        />
    );
}

/** Demonstrates the page's settings menu with switchable content. */
function MenuExample() {
    const location = useLocation();
    const navigate = useNavigate();

    // Keep router-backed fragment navigation local to the native preview, separate from the sandbox provider.
    return (
        <MenuNavigationContext
            value={{
                hash: location.hash,
                select: (id) => {
                    void navigate({ pathname: location.pathname, search: location.search, hash: `#${id}` });
                }
            }}
        >
            <Stack gap={0} padding={4}>
                <Menu
                    sections={[
                        {
                            title: 'Settings',
                            entries: [
                                {
                                    kind: 'item',
                                    label: 'Profile',
                                    icon: 'user-round',
                                    content: <span>Profile settings</span>
                                },
                                {
                                    kind: 'subsection',
                                    label: 'Workflow',
                                    icon: 'wrench',
                                    items: [
                                        {
                                            label: 'Automation',
                                            icon: 'refresh-cw',
                                            content: <span>Automation settings</span>
                                        },
                                        { label: 'Schedule', icon: 'calendar', content: <span>Schedule settings</span> }
                                    ]
                                },
                                {
                                    kind: 'subsection',
                                    label: 'Workspace',
                                    icon: 'building-complex',
                                    items: [
                                        { label: 'Members', icon: 'users', content: <span>Workspace members</span> },
                                        { label: 'Data', icon: 'database', content: <span>Workspace data</span> }
                                    ]
                                }
                            ]
                        }
                    ]}
                />
            </Stack>
        </MenuNavigationContext>
    );
}
