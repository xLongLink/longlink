import {
    AppWindow,
    BetweenHorizontalStart,
    Braces,
    Badge,
    ChartArea,
    ChartColumn,
    ChartLine,
    ChartPie,
    ChartRadar,
    CircleGauge,
    ChartNoAxesCombined,
    BookOpen,
    Box,
    Building2,
    CheckSquare,
    ChevronDown,
    CircleDot,
    CircleHelp,
    Columns3,
    CreditCard,
    Database,
    FileCode2,
    FileInput,
    FileSearch,
    FileText,
    FlaskConical,
    Gem,
    Globe,
    Grip,
    Grid2X2,
    HardDrive,
    Heading,
    Image,
    Layers,
    Link2,
    ListCollapse,
    ListFilter,
    Loader,
    Map,
    MapPin,
    MapPinned,
    Menu,
    MousePointer2,
    MessageSquare,
    Package,
    Orbit,
    PanelTop,
    PanelsTopLeft,
    Plug,
    Rocket,
    Route,
    Settings2,
    ShieldCheck,
    Table2,
    TableProperties,
    TextAlignStart,
    TextCursorInput,
    ToggleLeft,
    SlidersHorizontal,
    SlidersVertical,
    SquareMousePointer,
    CalendarClock,
    Users,
    Type,
    Waypoints,
    type LucideIcon
} from 'lucide-react';

export type PublicationPage = { path: string; label: string; icon: LucideIcon; children?: readonly PublicationPage[] };

type DocumentationSection = { title: string; pages: PublicationPage[]; paths?: readonly string[] };

// Keep category navigation and overview headings in the same reading order.
const categories = [
    { label: 'Introduction', category: 'Runtime', anchor: '', icon: BookOpen },
    { label: 'Hooks', category: 'Hooks', anchor: '#hooks', icon: FileCode2 },
    { label: 'Layout', category: 'Layouts', anchor: '#layouts', icon: FileCode2 },
    { label: 'Action', category: 'Action', anchor: '#action', icon: Waypoints },
    { label: 'Display', category: 'Display', anchor: '#display', icon: Image },
    { label: 'Form', category: 'Form', anchor: '#form', icon: FileText },
    { label: 'Charts', category: 'Charts', anchor: '#charts', icon: ChartArea },
    { label: 'Maps', category: 'Maps', anchor: '#maps', icon: Map }
] as const;

// Keep branding navigation and publication paths in their established reading order.
export const brandingPages = [
    { path: '/branding/assets', file: './routes/branding/assets.tsx', label: 'Brand assets', icon: Image },
    { path: '/branding/values', file: './routes/branding/values.tsx', label: 'Values', icon: Gem },
    {
        path: '/branding/comunication',
        file: './routes/branding/communication.tsx',
        label: 'Communication',
        icon: MessageSquare
    }
];

export const brandingPaths = brandingPages.map((page) => page.path);

// Keep legal navigation and publication paths in their established reading order.
export const legalPages = [
    { path: '/terms', file: './routes/legal/terms.tsx', label: 'Terms', icon: FileText },
    { path: '/impressum', file: './routes/legal/impressum.tsx', label: 'Impressum', icon: Building2 },
    { path: '/privacy', file: './routes/legal/privacy.tsx', label: 'Privacy', icon: ShieldCheck }
];

export const legalPaths = legalPages.map((page) => page.path);

const componentPages: {
    name: string;
    category: (typeof categories)[number]['category'];
    icon: LucideIcon;
    label?: string;
    slug?: string;
}[] = [
    { name: 'AreaChart', category: 'Charts', icon: ChartArea },
    { name: 'BarChart', category: 'Charts', icon: ChartColumn },
    { name: 'LineChart', category: 'Charts', icon: ChartLine },
    { name: 'PieChart', category: 'Charts', icon: ChartPie },
    { name: 'RadarChart', category: 'Charts', icon: ChartRadar },
    { name: 'RadialBarChart', category: 'Charts', icon: CircleGauge, slug: 'radial-chart' },
    { name: 'Sankey', category: 'Charts', icon: ChartNoAxesCombined, slug: 'sankey-chart' },
    { name: 'ChartLegend', category: 'Charts', icon: ListFilter },
    { name: 'Map', category: 'Maps', icon: Map },
    { name: 'MapControls', category: 'Maps', icon: Settings2 },
    { name: 'MapGeoJSON', category: 'Maps', icon: Globe, slug: 'map-geojson' },
    { name: 'StreetMap', category: 'Maps', icon: MapPinned },
    { name: 'MarkerMap', category: 'Maps', icon: MapPin },
    { name: 'RouteMap', category: 'Maps', icon: Waypoints },
    { name: 'ClusterMap', category: 'Maps', icon: Orbit },
    { name: 'ArcMap', category: 'Maps', icon: Route },
    { name: 'Avatar', category: 'Display', icon: Users },
    { name: 'Badge', category: 'Display', icon: Badge },
    { name: 'Box', category: 'Layouts', icon: Box },
    { name: 'Button', category: 'Action', icon: MousePointer2, label: 'Buttons', slug: 'buttons' },
    { name: 'Card', category: 'Layouts', icon: PanelTop },
    { name: 'Checkbox', category: 'Form', icon: CheckSquare },
    { name: 'Currency', category: 'Display', icon: CreditCard },
    { name: 'DataGrid', category: 'Display', icon: Grip },
    { name: 'Dialog', category: 'Layouts', icon: AppWindow },
    { name: 'Dropdown', category: 'Action', icon: ListCollapse },
    { name: 'Pagination', category: 'Action', icon: BetweenHorizontalStart },
    { name: 'Empty', category: 'Display', icon: Package },
    { name: 'FileType', category: 'Display', icon: FileText },
    { name: 'FileViewer', category: 'Display', icon: FileSearch },
    { name: 'Filters', category: 'Form', icon: SlidersHorizontal },
    { name: 'Frame', category: 'Layouts', icon: PanelsTopLeft },
    { name: 'Grid', category: 'Layouts', icon: Grid2X2 },
    { name: 'Heading', category: 'Display', icon: Heading },
    { name: 'Hooks', category: 'Runtime', icon: Braces },
    { name: 'useApi', category: 'Hooks', icon: Database },
    { name: 'useForm', category: 'Hooks', icon: FileInput },
    { name: 'useConfirm', category: 'Hooks', icon: CircleHelp },
    { name: 'useTable', category: 'Hooks', icon: TableProperties },
    { name: 'ReactHooks', category: 'Hooks', icon: FileCode2, label: 'React hooks' },
    { name: 'Icon', category: 'Display', icon: Gem, label: 'Icons', slug: 'icons' },
    { name: 'Image', category: 'Display', icon: Image },
    { name: 'Input', category: 'Form', icon: TextCursorInput },
    { name: 'Link', category: 'Action', icon: Link2 },
    { name: 'Menu', category: 'Layouts', icon: Menu },
    { name: 'Progress', category: 'Display', icon: Loader },
    { name: 'RadioGroup', category: 'Form', icon: CircleDot },
    { name: 'Select', category: 'Form', icon: ChevronDown },
    { name: 'Combobox', category: 'Form', icon: SquareMousePointer },
    { name: 'Slider', category: 'Form', icon: SlidersVertical },
    { name: 'Stack', category: 'Layouts', icon: Layers },
    { name: 'Switch', category: 'Form', icon: ToggleLeft },
    { name: 'Table', category: 'Display', icon: Table2 },
    { name: 'Tabs', category: 'Layouts', icon: Columns3 },
    { name: 'Text', category: 'Display', icon: Type },
    { name: 'Textarea', category: 'Form', icon: TextAlignStart },
    { name: 'Timestamp', category: 'Display', icon: CalendarClock }
];

export const componentDocumentation = componentPages.map((component) => ({
    ...component,
    label: component.label ?? component.name,
    slug:
        component.slug ??
        component.name
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/\s+/g, '-')
            .toLowerCase()
}));

export const documentationCategories = categories.map((category) => ({
    ...category,
    components: componentDocumentation.filter((component) => component.category === category.category)
}));

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
                    { path: '/docs/sdk/building', label: 'Building', icon: Rocket }
                ]
            }
        ]
    },
    {
        path: '/docs/sdk/views',
        label: 'Views',
        sections: [
            {
                title: 'Views',
                paths: [
                    '/docs/sdk/views',
                    ...documentationCategories.flatMap(({ components }) =>
                        components.map((component) => `/docs/sdk/views/${component.slug}`)
                    )
                ],
                pages: documentationCategories.map(({ label, category, anchor, icon, components }) => ({
                    path: `/docs/sdk/views${anchor}`,
                    label,
                    icon,
                    children:
                        category === 'Runtime'
                            ? undefined
                            : components.map((component) => ({
                                  path: `/docs/sdk/views/${component.slug}`,
                                  label: component.label,
                                  icon: component.icon
                              }))
                }))
            }
        ]
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
                    { path: '/docs/api/mcp', label: 'MCP', icon: Plug }
                ]
            },
            {
                title: 'Self hosted',
                pages: [
                    { path: '/docs/api/self-hosted/platform', label: 'Platform', icon: ShieldCheck },
                    { path: '/docs/api/self-hosted/compute', label: 'Compute', icon: Layers }
                ]
            }
        ]
    }
];

// Keep static tutorials and generated component references in their published reading order.
export const documentationPaths = [
    '/docs',
    ...documentationNavigation.flatMap(({ sections }) =>
        sections.flatMap(({ paths, pages }) => paths ?? pages.map(({ path }) => path))
    )
];
