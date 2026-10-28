import type { RouteConfig } from '@react-router/dev/routes';
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

// Keep branding publication paths in their established reading order.
export const brandingPaths: string[] = ['/branding/assets', '/branding/values', '/branding/comunication'];

// Keep legal publication paths in their established reading order.
export const legalPaths: string[] = ['/terms', '/impressum', '/privacy'];

// Keep the use-case collection's reading order explicit.
export const useCasePaths: string[] = ['/use-cases', '/use-cases/real-estate/property-acquisition-screening'];

// Derive route identity from the website's published component pages.
export const componentDocumentation = [
    { name: 'Avatar', category: 'Display' },
    { name: 'Badge', category: 'Display' },
    { name: 'Button', category: 'Action' },
    { name: 'Card', category: 'Layouts' },
    { name: 'CheckboxInput', category: 'Form' },
    { name: 'Collapsible', category: 'Layouts' },
    { name: 'Currency', category: 'Display' },
    { name: 'DateInput', category: 'Form' },
    { name: 'Dialog', category: 'Layouts' },
    { name: 'Divider', category: 'Display' },
    { name: 'DropdownMenu', category: 'Action' },
    { name: 'EmptyState', category: 'Display' },
    { name: 'FileInput', category: 'Form' },
    { name: 'FileViewer', category: 'Display' },
    { name: 'Form', category: 'Form' },
    { name: 'Functions', category: 'Runtime' },
    { name: 'Grid', category: 'Layouts' },
    { name: 'Heading', category: 'Display' },
    { name: 'Hooks', category: 'Runtime' },
    { name: 'Icon', category: 'Display' },
    { name: 'IconButton', category: 'Action' },
    { name: 'Image', category: 'Display' },
    { name: 'Link', category: 'Action' },
    { name: 'Menu', category: 'Layouts' },
    { name: 'MetadataList', category: 'Display' },
    { name: 'MoreMenu', category: 'Action' },
    { name: 'MultiSelector', category: 'Form' },
    { name: 'NumberInput', category: 'Form' },
    { name: 'Pagination', category: 'Action' },
    { name: 'ProgressBar', category: 'Display' },
    { name: 'RadioList', category: 'Form' },
    { name: 'Selector', category: 'Form' },
    { name: 'Slider', category: 'Form' },
    { name: 'Stack', category: 'Layouts' },
    { name: 'Stepper', category: 'Layouts' },
    { name: 'Switch', category: 'Form' },
    { name: 'Table', category: 'Display' },
    { name: 'Tabs', category: 'Layouts' },
    { name: 'Text', category: 'Display' },
    { name: 'TextArea', category: 'Form' },
    { name: 'TextInput', category: 'Form' },
    { name: 'TimeInput', category: 'Form' },
    { name: 'Timestamp', category: 'Display' },
    { name: 'Token', category: 'Display' },
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

const componentIcons = new Map<string, LucideIcon>(
    Object.entries({
        Avatar: Users,
        Badge: Circle,
        Button: PanelTop,
        Card: PanelTop,
        CheckboxInput: CheckSquare,
        Collapsible: ChevronDown,
        Currency: CreditCard,
        DateInput: Calendar,
        Dialog: AppWindow,
        Divider: Columns3,
        DropdownMenu: ChevronDown,
        EmptyState: Package,
        FileInput: FileCode2,
        FileViewer: FileText,
        Form: FileText,
        Grid: Grip,
        Heading: Type,
        Icon: Gem,
        IconButton: Circle,
        Image,
        Link: Globe,
        Menu,
        MetadataList: List,
        MoreMenu: Menu,
        MultiSelector: CheckSquare,
        NumberInput: ArrowUpDown,
        Pagination: BookOpen,
        ProgressBar: Layers,
        RadioList: List,
        Selector: ChevronDown,
        Slider: Settings2,
        Stack: Layers,
        Stepper: Waypoints,
        Switch: Settings2,
        Table: Columns3,
        Tabs: PanelTop,
        Text: Type,
        TextArea: FileText,
        TextInput: Type,
        TimeInput: Clock,
        Timestamp: Calendar,
        Token: Gem,
    })
);

export const documentationSections: Array<{ title: string; pages: Array<DocumentationPage> }> = [
    {
        title: 'Introduction',
        pages: [{ path: '/docs', label: 'Documentation', icon: BookOpen }],
    },
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
                                        icon: componentIcons.get(component.name) ?? FileCode2,
                                    },
                                ]
                              : []
                      ),
        })),
    },
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
        title: 'Alternatives',
        pages: [],
    },
];

// Keep static tutorials and generated component references in their published reading order.
const viewDocumentationPaths = [
    '/docs/sdk/views',
    ...documentationCategories.flatMap((category) =>
        componentDocumentation.flatMap((component) =>
            component.category === category ? [`/docs/sdk/views/${component.slug}`] : []
        )
    ),
];

export const documentationPaths = documentationSections.flatMap(({ title, pages }) =>
    title === 'Views' ? viewDocumentationPaths : pages.map(({ path }) => path)
);

export default [
    {
        file: './layouts/Page.tsx',
        children: [
            { index: true, file: './routes/Index.tsx' },
            { path: 'pricing', file: './routes/Pricing.tsx' },
            { path: 'blog', file: './routes/blog/Index.tsx' },
            { path: 'blog/why-longlink', file: './routes/blog/WhyLongLink.tsx' },
            // { path: 'use-cases', file: './routes/usecases/Index.tsx' },
        ],
    },
    /* Use cases are a work in progress; retain the route definitions for later.
    {
        file: './layouts/UseCases.tsx',
        children: [
            {
                path: 'use-cases/real-estate/property-acquisition-screening',
                file: './routes/usecases/Screening.tsx',
            },
            { path: 'use-cases/*', file: '../components/layouts/NotFound.tsx', id: 'use-cases-not-found' },
        ],
    },
    */
    { path: 'docs/introduction', file: './routes/docs/Introduction.tsx' },
    {
        file: './layouts/Documentation.tsx',
        children: [
            { path: 'docs', index: true, file: './routes/docs/Index.tsx' },
            { path: 'docs/sdk', index: true, file: './routes/docs/sdk/Index.tsx' },
            { path: 'docs/sdk/building', file: './routes/docs/sdk/Building.tsx' },
            { path: 'docs/sdk/database', file: './routes/docs/sdk/Database.tsx' },
            { path: 'docs/sdk/environments', file: './routes/docs/sdk/Environments.tsx' },
            { path: 'docs/sdk/routes', file: './routes/docs/sdk/Routes.tsx' },
            { path: 'docs/sdk/storage', file: './routes/docs/sdk/Storage.tsx' },
            { path: 'docs/sdk/testing', file: './routes/docs/sdk/Testing.tsx' },
            { path: 'docs/sdk/views', index: true, file: './routes/docs/sdk/Views.tsx' },

            // Keep component routes aligned with the published documentation catalog.
            ...componentDocumentation.map(({ slug, label }) => ({
                path: `docs/sdk/views/${slug}`,
                file: `./routes/docs/sdk/views/${label}.tsx`,
            })),
            { path: 'docs/api', index: true, file: './routes/docs/api/Index.tsx' },
            { path: 'docs/api/organizations', file: './routes/docs/api/Organizations.tsx' },
            { path: 'docs/api/solutions', file: './routes/docs/api/Solutions.tsx' },
            { path: 'docs/api/mcp', file: './routes/docs/api/Mcp.tsx' },
            { path: 'docs/api/billing', file: './routes/docs/api/Billing.tsx' },
            { path: 'docs/alternatives', file: './routes/docs/alternatives/Index.tsx' },
            { path: 'docs/*', file: '../components/layouts/NotFound.tsx', id: 'docs-not-found' },
        ],
    },
    {
        file: './layouts/Legal.tsx',
        children: [
            { path: 'terms', file: './routes/legal/Terms.tsx' },
            { path: 'impressum', file: './routes/legal/Impressum.tsx' },
            { path: 'privacy', file: './routes/legal/Privacy.tsx' },
            { path: 'branding/assets', file: './routes/branding/Assets.tsx' },
            { path: 'branding/values', file: './routes/branding/Values.tsx' },
            { path: 'branding/comunication', file: './routes/branding/Communication.tsx' },
        ],
    },
    {
        file: './layouts/Brand.tsx',
        children: [
            { path: 'auth/register', file: './routes/auth/Register.tsx' },
            { path: 'auth/verify-email', file: './routes/auth/VerifyEmail.tsx' },
            { path: 'auth/forgot-password', file: './routes/auth/ForgotPassword.tsx' },
            { path: 'auth/reset-password', file: './routes/auth/ResetPassword.tsx' },
            { path: 'login', file: './routes/auth/Login.tsx' },
            { path: 'mcp/authorize', file: './routes/auth/Mcp.tsx' },
            { path: '404', file: '../components/layouts/NotFound.tsx', id: 'not-found' },
            { path: '*', file: '../components/layouts/NotFound.tsx' },
        ],
    },
    {
        file: './layouts/Authenticated.tsx',
        children: [
            {
                file: './layouts/User.tsx',
                children: [
                    { path: 'user/organizations', file: './routes/user/Organizations.tsx' },
                    { path: 'user/settings', file: './routes/user/Settings.tsx' },
                ],
            },
            {
                file: './layouts/Admin.tsx',
                children: [
                    { id: 'admin-users', path: 'admin/users', file: './routes/admin/Users.tsx' },
                    { id: 'admin-solutions', path: 'admin/solutions', file: './routes/admin/Solutions.tsx' },
                    {
                        id: 'admin-organizations',
                        path: 'admin/organizations',
                        file: './routes/admin/Organizations.tsx',
                    },
                    { id: 'admin-compute', path: 'admin/compute', file: './routes/admin/Compute.tsx' },
                    { id: 'admin-operations', path: 'admin/operations', file: './routes/admin/Operations.tsx' },
                ],
            },
            {
                file: './layouts/OrganizationAccess.tsx',
                children: [
                    {
                        file: './layouts/Organization.tsx',
                        children: [
                            { path: 'orgs/:organization', index: true, file: './routes/orgs/Organization.tsx' },
                            { path: 'orgs/:organization/settings', file: './routes/orgs/Settings.tsx' },
                        ],
                    },
                    { path: 'orgs/:organization/solutions/:solution/*', file: './routes/orgs/Solution.tsx' },
                ],
            },
        ],
    },
] satisfies RouteConfig;
