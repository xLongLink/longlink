import ViewLayout from './view-layout';
import { useLocation, useNavigate } from 'react-router';
import { MenuNavigationContext } from '@/components/custom/contexts';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Menu, MenuSection, MenuSubSection, MenuItem } from '@/components/custom/menu';

/** Documents section navigation and selected content. */
export default function MenuPage() {
    // Render navigation guidance with separate component property tables.
    return (
        <ViewLayout
            name="Menu"
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'MenuSection elements defining navigation and content.'
                },
                { name: 'gap', type: '0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10' },
                {
                    name: 'MenuSection.children',
                    type: 'ReactNode',
                    description: 'MenuItem elements or nested MenuSubSection groups.'
                },
                {
                    name: 'MenuSection.isHeaderHidden',
                    type: 'boolean',
                    description: 'Hides the section heading; visible by default.'
                },
                {
                    name: 'MenuSection.title',
                    type: 'string',
                    description: 'Section heading displayed in the navigation.'
                },
                {
                    name: 'MenuItem.children',
                    type: 'ReactNode',
                    description: 'Content mounted beside the navigation while this item is selected.'
                },
                {
                    name: 'MenuItem.icon',
                    type: 'IconName',
                    description: 'Optional Lucide icon name displayed beside the label.'
                },
                {
                    name: 'MenuItem.label',
                    type: 'string',
                    description: "Navigation label; its lowercase, hyphenated form identifies the item's URL fragment."
                },
                {
                    name: 'MenuSubSection.children',
                    type: 'ReactNode',
                    description: 'MenuItem elements nested inside this collapsible group.'
                },
                {
                    name: 'MenuSubSection.icon',
                    type: 'IconName',
                    description: 'Optional Lucide icon name displayed beside the group label.'
                },
                {
                    name: 'MenuSubSection.label',
                    type: 'string',
                    description: 'Label displayed on the collapsible navigation group.'
                }
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
            <Stack padding={4}>
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
