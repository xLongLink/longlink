import { createElement } from 'react';
import {
    AppWindow,
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
    Waypoints,
} from 'lucide-react';
import type { ArticleNavigationGroup, ArticleNavigationItem } from '@/lib/articles';

type DocumentationPage = ArticleNavigationItem & { category?: string };

export const DOCUMENTATION_GROUPS: ArticleNavigationGroup[] = [
    {
        title: 'Overview',
        items: [
            { title: 'Introduction', path: '/docs', icon: createElement(BookOpen, { 'aria-hidden': true, size: 16 }) },
        ],
    },
    {
        title: 'Platform',
        items: [
            {
                title: 'Overview',
                path: '/docs/api',
                icon: createElement(ShieldCheck, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Organizations',
                path: '/docs/api/organizations',
                icon: createElement(Building2, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Applications',
                path: '/docs/api/applications',
                icon: createElement(AppWindow, { 'aria-hidden': true, size: 16 }),
            },
        ],
    },
    {
        title: 'Applications',
        items: [
            { title: 'Overview', path: '/docs/sdk', icon: createElement(Package, { 'aria-hidden': true, size: 16 }) },
            {
                title: 'Environments',
                path: '/docs/sdk/environments',
                icon: createElement(Globe, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Routes',
                path: '/docs/sdk/routes',
                icon: createElement(Waypoints, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Storage',
                path: '/docs/sdk/storage',
                icon: createElement(HardDrive, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Database',
                path: '/docs/sdk/database',
                icon: createElement(Database, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Pages',
                path: '/docs/sdk/pages',
                icon: createElement(FileCode2, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Testing',
                path: '/docs/sdk/testing',
                icon: createElement(FlaskConical, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Building',
                path: '/docs/sdk/building',
                icon: createElement(Rocket, { 'aria-hidden': true, size: 16 }),
            },
        ],
    },
];

export const DOCUMENTATION_REFERENCE_PAGES: DocumentationPage[] = [
    { category: 'Runtime', path: '/docs/sdk/pages/if', title: 'if' },
    { category: 'Runtime', path: '/docs/sdk/pages/expressions', title: 'Expressions' },
    { category: 'Runtime', path: '/docs/sdk/pages/bindings', title: 'Bindings' },
    { category: 'State', path: '/docs/sdk/pages/state', title: 'State' },
    { category: 'State', path: '/docs/sdk/pages/query', title: 'Query' },
    { category: 'State', path: '/docs/sdk/pages/action', title: 'Action' },
    { category: 'State', path: '/docs/sdk/pages/for', title: 'For' },
    { category: 'Action', path: '/docs/sdk/pages/button', title: 'Button' },
    { category: 'Action', path: '/docs/sdk/pages/link', title: 'Link' },
    { category: 'Layout', path: '/docs/sdk/pages/card', title: 'Card' },
    { category: 'Content', path: '/docs/sdk/pages/avatar', title: 'Avatar' },
    { category: 'Content', path: '/docs/sdk/pages/heading', title: 'Heading' },
    { category: 'Content', path: '/docs/sdk/pages/icon', title: 'Icon' },
    { category: 'Content', path: '/docs/sdk/pages/text', title: 'Text' },
    { category: 'Form', path: '/docs/sdk/pages/checkbox-input', title: 'CheckboxInput' },
    { category: 'Form', path: '/docs/sdk/pages/file-input', title: 'FileInput' },
    { category: 'Form', path: '/docs/sdk/pages/number-input', title: 'NumberInput' },
    { category: 'Form', path: '/docs/sdk/pages/radio-list', title: 'RadioList' },
    { category: 'Form', path: '/docs/sdk/pages/radio-list-item', title: 'RadioListItem' },
    { category: 'Form', path: '/docs/sdk/pages/selector', title: 'Selector' },
    { category: 'Form', path: '/docs/sdk/pages/selector-option', title: 'SelectorOption' },
    { category: 'Form', path: '/docs/sdk/pages/slider', title: 'Slider' },
    { category: 'Form', path: '/docs/sdk/pages/switch', title: 'Switch' },
    { category: 'Form', path: '/docs/sdk/pages/text-area', title: 'TextArea' },
    { category: 'Form', path: '/docs/sdk/pages/text-input', title: 'TextInput' },
    { category: 'Content', path: '/docs/sdk/pages/badge', title: 'Badge' },
    { category: 'Layout', path: '/docs/sdk/pages/divider', title: 'Divider' },
    { category: 'Layout', path: '/docs/sdk/pages/grid', title: 'Grid' },
    { category: 'Layout', path: '/docs/sdk/pages/stack', title: 'Stack' },
    { category: 'Layout', path: '/docs/sdk/pages/side-nav', title: 'SideNav' },
    { category: 'Layout', path: '/docs/sdk/pages/tab', title: 'Tab' },
    { category: 'Layout', path: '/docs/sdk/pages/dialog', title: 'Dialog' },
    { category: 'Layout', path: '/docs/sdk/pages/table', title: 'Table' },
];

export const DOCUMENTATION_PAGES = [
    ...DOCUMENTATION_GROUPS.flatMap(({ items }) => items),
    ...DOCUMENTATION_REFERENCE_PAGES,
];
