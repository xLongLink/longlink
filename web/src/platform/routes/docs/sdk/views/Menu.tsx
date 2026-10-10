import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { useLocation, useNavigate } from 'react-router';
import { Menu, MenuSection, MenuItem, MenuNavigationContext } from '@/components/ui/Menu';

/** Documents section navigation and selected content. */
export default function MenuPage() {
    // Render navigation guidance with separate component property tables.
    return (
        <ViewLayout
            name="Menu"
            introduction="Menu is a LongLink component that combines section navigation with the selected section’s content. It uses Astryx SideNav internally."
            examples={[
                {
                    title: 'Menu',
                    preview: <MenuExample />,
                    code: `function Example() {
  return (
    <Menu>
      <MenuSection title="Settings">
        <MenuItem label="Profile">
          <Text>Profile settings</Text>
        </MenuItem>
        <MenuItem label="Workflow">
          <Text>Workflow settings</Text>
        </MenuItem>
      </MenuSection>
    </Menu>
  );
}`,
                },
            ]}
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
                    void navigate({
                        pathname: location.pathname,
                        search: location.search,
                        hash: `#${id}`,
                    });
                },
            }}
        >
            <Menu>
                <MenuSection title="Settings">
                    <MenuItem label="Profile">
                        <Text>Profile settings</Text>
                    </MenuItem>
                    <MenuItem label="Workflow">
                        <Text>Workflow settings</Text>
                    </MenuItem>
                </MenuSection>
            </Menu>
        </MenuNavigationContext>
    );
}
