import ViewLayout from './view-layout';
import { useLocation, useNavigate } from 'react-router';
import { Stack } from '@/components/longlink/layout/stack';
import { MenuNavigationContext } from '@/components/custom/contexts';
import { Menu, MenuSection, MenuSubSection, MenuItem } from '@/components/longlink/layout/menu';

/** Documents section navigation and selected content. */
export default function MenuPage() {
    // Render navigation guidance with separate component property tables.
    return (
        <ViewLayout
            name="Menu"
            properties={[
                { name: 'children', type: 'ReactNode' },
                { name: 'gap', type: 'number' },
                { name: 'MenuSection.children', type: 'ReactNode' },
                { name: 'MenuSection.isHeaderHidden', type: 'boolean' },
                { name: 'MenuSection.title', type: 'string' },
                { name: 'MenuItem.children', type: 'ReactNode' },
                { name: 'MenuItem.icon', type: 'IconName' },
                { name: 'MenuItem.label', type: 'string' },
                { name: 'MenuSubSection.children', type: 'ReactNode' },
                { name: 'MenuSubSection.icon', type: 'IconName' },
                { name: 'MenuSubSection.label', type: 'string' }
            ]}
            example={{
                title: 'Menu',
                preview: <MenuExample />,
                code: `function Example() {
  return (
    <Stack padding={4}>
      <Menu>
        <MenuSection title="Settings">
          <MenuItem label="Profile" icon="user-round">
            <Text>Profile settings</Text>
          </MenuItem>
          <MenuSubSection label="Workflow" icon="wrench">
            <MenuItem label="Automation" icon="refresh-cw">
              <Text>Automation settings</Text>
            </MenuItem>
            <MenuItem label="Schedule" icon="calendar">
              <Text>Schedule settings</Text>
            </MenuItem>
          </MenuSubSection>
          <MenuSubSection label="Workspace" icon="building-complex">
            <MenuItem label="Members" icon="users">
              <Text>Workspace members</Text>
            </MenuItem>
            <MenuItem label="Data" icon="database">
              <Text>Workspace data</Text>
            </MenuItem>
          </MenuSubSection>
        </MenuSection>
      </Menu>
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
                <Menu>
                    <MenuSection title="Settings">
                        <MenuItem label="Profile" icon="user-round">
                            <span>Profile settings</span>
                        </MenuItem>
                        <MenuSubSection label="Workflow" icon="wrench">
                            <MenuItem label="Automation" icon="refresh-cw">
                                <span>Automation settings</span>
                            </MenuItem>
                            <MenuItem label="Schedule" icon="calendar">
                                <span>Schedule settings</span>
                            </MenuItem>
                        </MenuSubSection>
                        <MenuSubSection label="Workspace" icon="building-complex">
                            <MenuItem label="Members" icon="users">
                                <span>Workspace members</span>
                            </MenuItem>
                            <MenuItem label="Data" icon="database">
                                <span>Workspace data</span>
                            </MenuItem>
                        </MenuSubSection>
                    </MenuSection>
                </Menu>
            </Stack>
        </MenuNavigationContext>
    );
}
