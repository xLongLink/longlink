import { documentationCategories } from '../lib/documentation';
import {
    AppWindow,
    ArrowUpDown,
    BookOpen,
    Building2,
    Calendar,
    CheckSquare,
    ChevronDown,
    Circle,
    Clock,
    Columns3,
    CreditCard,
    Database,
    FileCode2,
    FileText,
    FlaskConical,
    Gem,
    Globe,
    Grip,
    HardDrive,
    Image,
    Layers,
    List,
    Menu,
    MessageSquare,
    Package,
    PanelTop,
    Plug,
    Rocket,
    Settings2,
    ShieldCheck,
    Users,
    Type,
    Waypoints,
    type LucideIcon,
} from 'lucide-react';

type DocumentationPage = {
    path: string;
    label: string;
    icon: LucideIcon;
    children?: Array<{ path: string; label: string; icon: LucideIcon }>;
};

type DocumentationSection = {
    title: string;
    pages: DocumentationPage[];
    paths?: readonly string[];
};

// Keep branding navigation and publication paths in their established reading order.
export const brandingPages = [
    { path: '/branding/assets', label: 'Brand assets', icon: Image },
    { path: '/branding/values', label: 'Values', icon: Gem },
    { path: '/branding/comunication', label: 'Communication', icon: MessageSquare },
];

export const brandingPaths = brandingPages.map((page) => page.path);

// Keep legal navigation and publication paths in their established reading order.
export const legalPages = [
    { path: '/terms', label: 'Terms', icon: FileText },
    { path: '/impressum', label: 'Impressum', icon: Building2 },
    { path: '/privacy', label: 'Privacy', icon: ShieldCheck },
];

export const legalPaths = legalPages.map((page) => page.path);

// Derive route identity from the website's published component pages.
export const componentDocumentation = [
    { name: 'Avatar', category: 'Display', icon: Users },
    { name: 'Badge', category: 'Display', icon: Circle },
    { name: 'Button', category: 'Action', icon: PanelTop },
    { name: 'Card', category: 'Layouts', icon: PanelTop },
    { name: 'CheckboxInput', category: 'Form', icon: CheckSquare },
    { name: 'Collapsible', category: 'Layouts', icon: ChevronDown },
    { name: 'Currency', category: 'Display', icon: CreditCard },
    { name: 'DateInput', category: 'Form', icon: Calendar },
    { name: 'Dialog', category: 'Layouts', icon: AppWindow },
    { name: 'Divider', category: 'Display', icon: Columns3 },
    { name: 'DropdownMenu', category: 'Action', icon: ChevronDown },
    { name: 'EmptyState', category: 'Display', icon: Package },
    { name: 'FileInput', category: 'Form', icon: FileCode2 },
    { name: 'FileViewer', category: 'Display', icon: FileText },
    { name: 'Form', category: 'Form', icon: FileText },
    { name: 'Functions', category: 'Runtime' },
    { name: 'Grid', category: 'Layouts', icon: Grip },
    { name: 'Heading', category: 'Display', icon: Type },
    { name: 'Hooks', category: 'Runtime' },
    { name: 'Icon', category: 'Display', icon: Gem },
    { name: 'IconButton', category: 'Action', icon: Circle },
    { name: 'Image', category: 'Display', icon: Image },
    { name: 'Link', category: 'Action', icon: Globe },
    { name: 'Menu', category: 'Layouts', icon: Menu },
    { name: 'MetadataList', category: 'Display', icon: List },
    { name: 'MoreMenu', category: 'Action', icon: Menu },
    { name: 'MultiSelector', category: 'Form', icon: CheckSquare },
    { name: 'NumberInput', category: 'Form', icon: ArrowUpDown },
    { name: 'Pagination', category: 'Action', icon: BookOpen },
    { name: 'ProgressBar', category: 'Display', icon: Layers },
    { name: 'RadioList', category: 'Form', icon: List },
    { name: 'Selector', category: 'Form', icon: ChevronDown },
    { name: 'Slider', category: 'Form', icon: Settings2 },
    { name: 'Stack', category: 'Layouts', icon: Layers },
    { name: 'Stepper', category: 'Layouts', icon: Waypoints },
    { name: 'Switch', category: 'Form', icon: Settings2 },
    { name: 'Table', category: 'Display', icon: Columns3 },
    { name: 'Tabs', category: 'Layouts', icon: PanelTop },
    { name: 'Text', category: 'Display', icon: Type },
    { name: 'TextArea', category: 'Form', icon: FileText },
    { name: 'TextInput', category: 'Form', icon: Type },
    { name: 'TimeInput', category: 'Form', icon: Clock },
    { name: 'Timestamp', category: 'Display', icon: Calendar },
    { name: 'Token', category: 'Display', icon: Gem },
].map((component) => ({
    ...component,
    label: component.name === 'Button' ? 'Buttons' : component.name,
    slug:
        component.name === 'Button'
            ? 'buttons'
            : component.name
                  .replace(/([a-z])([A-Z])/g, '$1-$2')
                  .replace(/\s+/g, '-')
                  .toLowerCase(),
}));

export const documentationIntroduction: DocumentationSection = {
    title: 'Introduction',
    pages: [{ path: '/docs', label: 'Documentation', icon: BookOpen }],
};

export const documentationNavigation: Array<{ path: string; label: string; sections: DocumentationSection[] }> = [
    {
        path: '/docs/sdk',
        label: 'Solutions',
        sections: [
            {
                title: 'Solutions',
                pages: [
                    { path: '/docs/sdk', label: 'Overview', icon: Package },
                    { path: '/docs/sdk/environments', label: 'Environments', icon: Globe },
                    { path: '/docs/sdk/routes', label: 'Routes', icon: Waypoints },
                    { path: '/docs/sdk/storage', label: 'Storage', icon: HardDrive },
                    { path: '/docs/sdk/database', label: 'Database', icon: Database },
                    { path: '/docs/sdk/testing', label: 'Testing', icon: FlaskConical },
                    { path: '/docs/sdk/building', label: 'Building', icon: Rocket },
                ],
            },
            {
                title: 'Views',
                paths: [
                    '/docs/sdk/views',
                    ...documentationCategories.flatMap((category) =>
                        componentDocumentation.flatMap((component) =>
                            component.category === category ? [`/docs/sdk/views/${component.slug}`] : []
                        )
                    ),
                ],
                pages: [
                    { label: 'Introduction', category: 'Runtime', anchor: '', icon: BookOpen },
                    { label: 'Layout', category: 'Layouts', anchor: '#layouts', icon: FileCode2 },
                    { label: 'Action', category: 'Action', anchor: '#action', icon: Waypoints },
                    { label: 'Display', category: 'Display', anchor: '#display', icon: Image },
                    { label: 'Form', category: 'Form', anchor: '#form', icon: FileText },
                ].map(({ label, category, anchor, icon }) => ({
                    path: `/docs/sdk/views${anchor}`,
                    label,
                    icon,
                    children:
                        category === 'Runtime'
                            ? undefined
                            : componentDocumentation.flatMap((component) =>
                                  component.category === category
                                      ? [
                                            {
                                                path: `/docs/sdk/views/${component.slug}`,
                                                label: component.label,
                                                icon: component.icon ?? FileCode2,
                                            },
                                        ]
                                      : []
                              ),
                })),
            },
        ],
    },
    {
        path: '/docs/api',
        label: 'Platform',
        sections: [
            {
                title: 'Platform',
                pages: [
                    { path: '/docs/api', label: 'Overview', icon: ShieldCheck },
                    { path: '/docs/api/organizations', label: 'Organizations', icon: Building2 },
                    { path: '/docs/api/solutions', label: 'Solutions', icon: Package },
                    { path: '/docs/api/mcp', label: 'MCP', icon: Plug },
                    { path: '/docs/api/billing', label: 'Billing', icon: CreditCard },
                ],
            },
            {
                title: 'Self hosted',
                pages: [
                    { path: '/docs/api/self-hosted/platform', label: 'Platform', icon: ShieldCheck },
                    { path: '/docs/api/self-hosted/compute', label: 'Compute', icon: Layers },
                ],
            },
        ],
    },
    {
        path: '/docs/alternatives',
        label: 'Alternatives',
        sections: [{ title: 'Alternatives', pages: [] }],
    },
];

// Keep static tutorials and generated component references in their published reading order.
export const documentationPaths = [
    documentationIntroduction,
    ...documentationNavigation.flatMap(({ sections }) => sections),
].flatMap(({ paths, pages }) => paths ?? pages.map(({ path }) => path));
