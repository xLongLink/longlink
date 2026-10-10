import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Menu, MenuSection, MenuItem } from '@/components/ui/Menu';

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
    // Let the menu manage selection and show the chosen settings panel.
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
}
