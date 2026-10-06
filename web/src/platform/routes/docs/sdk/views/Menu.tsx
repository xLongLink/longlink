import { Text } from '@astryxdesign/core/Text';
import ViewLayout, { type ViewProperties } from './ViewLayout';
import { Menu, MenuSection, MenuItem } from '@/components/ui/Menu';

// Keep each Menu component's JSX contract separately readable.
const properties: ViewProperties = [
    {
        name: 'Menu',
        properties: [
            {
                name: 'children',
                type: 'ViewNode',
                description: 'MenuSection elements defining navigation and content.',
            },
            {
                name: 'gap',
                type: 'Spacing',
                description: 'Spacing between elements in the selected item’s content. Defaults to 3.',
            },
        ],
    },
    {
        name: 'MenuSection',
        properties: [
            { name: 'title', type: 'string', required: true, description: 'Section heading in the navigation.' },
            { name: 'isHeaderHidden', type: 'boolean', description: 'Hides the section heading. Defaults to false.' },
            { name: 'children', type: 'ViewNode', description: 'MenuItem elements or nested MenuSubSection groups.' },
        ],
    },
    {
        name: 'MenuItem',
        properties: [
            { name: 'label', type: 'string', required: true, description: 'Item label displayed in the navigation.' },
            {
                name: 'id',
                type: 'string',
                description:
                    'Unique URL fragment for selection. Defaults to the lowercase label with spaces and punctuation replaced by hyphens.',
            },
            { name: 'icon', type: 'string', description: 'Optional LongLink icon name displayed beside the label.' },
            {
                name: 'children',
                type: 'ViewNode',
                description: 'Content mounted beside the navigation when this item is selected.',
            },
        ],
    },
];

/** Documents section navigation and selected content. */
export default function MenuPage() {
    // Render navigation guidance with separate component property tables.
    return (
        <ViewLayout
            name="Menu"
            properties={properties}
            reference={{
                introduction:
                    'Menu is a LongLink component that combines section navigation with the selected section’s content. It uses Astryx SideNav internally.',
                properties: [],
                practices: [
                    {
                        guidance: true,
                        description:
                            'Use unique labels or explicit ids for items. Labels become URL fragments by default. Put nested items inside MenuSubSection.',
                    },
                ],
            }}
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
export function MenuExample() {
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
