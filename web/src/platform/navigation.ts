import { createElement } from 'react';
import {
    AppWindow,
    ArrowUpDown,
    BookOpen,
    Building2,
    Database,
    FileCode2,
    FlaskConical,
    Globe,
    HardDrive,
    Package,
    Rocket,
    ShieldCheck,
    Users,
    Waypoints,
    Wrench,
} from 'lucide-react';
import type { ArticleNavigationGroup } from '@/lib/articles';

type DocPage = { category: string; path: string; title: string };

const pageReferencePages = [
    ['Runtime', 'if'],
    ['Runtime', 'Expressions'],
    ['Runtime', 'Bindings'],
    ['State', 'State'],
    ['State', 'Query'],
    ['State', 'Action'],
    ['State', 'For'],
    ['Action', 'Button'],
    ['Action', 'Link'],
    ['Layout', 'Card'],
    ['Content', 'Avatar'],
    ['Content', 'Heading'],
    ['Content', 'Icon'],
    ['Content', 'Text'],
    ['Form', 'CheckboxInput'],
    ['Form', 'FileInput'],
    ['Form', 'NumberInput'],
    ['Form', 'RadioList'],
    ['Form', 'RadioListItem'],
    ['Form', 'Selector'],
    ['Form', 'SelectorOption'],
    ['Form', 'Slider'],
    ['Form', 'Switch'],
    ['Form', 'TextArea'],
    ['Form', 'TextInput'],
    ['Content', 'Badge'],
    ['Layout', 'Divider'],
    ['Layout', 'Grid'],
    ['Layout', 'Stack'],
    ['Layout', 'SideNav'],
    ['Layout', 'Tab'],
    ['Layout', 'Dialog'],
    ['Layout', 'Table'],
] as const;

const DOC_SECTIONS = [
    { title: 'Overview', items: [{ title: 'Introduction', path: '/docs', icon: BookOpen }] },
    {
        title: 'Platform',
        items: [
            { title: 'Overview', path: '/docs/api', icon: ShieldCheck },
            { title: 'Organizations', path: '/docs/api/organizations', icon: Building2 },
            { title: 'Applications', path: '/docs/api/applications', icon: AppWindow },
        ],
    },
    {
        title: 'Applications',
        items: [
            { title: 'Overview', path: '/docs/sdk', icon: Package },
            { title: 'Environments', path: '/docs/sdk/environments', icon: Globe },
            { title: 'Routes', path: '/docs/sdk/routes', icon: Waypoints },
            { title: 'Storage', path: '/docs/sdk/storage', icon: HardDrive },
            { title: 'Database', path: '/docs/sdk/database', icon: Database },
            { title: 'Pages', path: '/docs/sdk/pages', icon: FileCode2 },
            { title: 'Testing', path: '/docs/sdk/testing', icon: FlaskConical },
            { title: 'Building', path: '/docs/sdk/building', icon: Rocket },
        ],
    },
] as const;

export const ADMIN_NAVIGATION = [
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/applications', icon: AppWindow, label: 'Applications' },
    { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
    { href: '/admin/database', icon: Database, label: 'Database' },
    { href: '/admin/storage', icon: HardDrive, label: 'Storage' },
    { href: '/admin/compute', icon: Wrench, label: 'Compute' },
    { href: '/admin/operations', icon: ArrowUpDown, label: 'Operations' },
] as const;

export const pageReferenceDocs: DocPage[] = pageReferencePages.map(([category, title]) => ({
    category,
    path: `/docs/sdk/pages/${title === 'if' ? title : title.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).slice(1)}`,
    title,
}));

export const DOC_GROUPS: ArticleNavigationGroup[] = DOC_SECTIONS.map(({ items, title }) => ({
    title,
    items: items.map(({ icon: Icon, ...item }) => ({
        ...item,
        icon: createElement(Icon, { 'aria-hidden': true, size: 16 }),
    })),
}));

export const DOC_PAGE_PATHS = [...DOC_GROUPS.flatMap(({ items }) => items), ...pageReferenceDocs];

export const LEGAL_GROUPS = [
    {
        title: 'Legal',
        items: [
            { title: 'Terms', path: '/terms' },
            { title: 'Impressum', path: '/impressum' },
            { title: 'Privacy', path: '/privacy' },
        ],
    },
] satisfies ArticleNavigationGroup[];
