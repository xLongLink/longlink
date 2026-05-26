import {
    Blocks,
    BookOpen,
    Database,
    FlaskConical,
    FileCode2,
    Globe,
    HardDrive,
    LayoutTemplate,
    Rocket,
    ServerCog,
    ShieldCheck,
    Waypoints,
} from 'lucide-react';

import type { DocGroup } from './types';

export const DOC_GROUPS: DocGroup[] = [
    {
        title: 'Overview',
        items: [
            {
                title: 'Introduction',
                path: '/docs',
                id: 'introduction',
                icon: BookOpen,
            },
        ],
    },
    {
        title: 'Control Plane',
        items: [
            {
                title: 'Overview',
                path: '/docs/api',
                id: 'control-plane-overview',
                icon: ShieldCheck,
            },
            {
                title: 'Self Hosted',
                path: '/docs/api/self-hosted',
                id: 'self-hosted',
                icon: ServerCog,
            },
        ],
    },
    {
        title: 'Applications SDK',
        items: [
            {
                title: 'Overview',
                path: '/docs/sdk',
                id: 'sdk-overview',
                icon: Blocks,
            },
            {
                title: 'Environments',
                path: '/docs/sdk/environments',
                id: 'environments',
                icon: Globe,
            },
            {
                title: 'Routes',
                path: '/docs/sdk/routes',
                id: 'routes',
                icon: Waypoints,
            },
            {
                title: 'Storage',
                path: '/docs/sdk/storage',
                id: 'storage',
                icon: HardDrive,
            },
            {
                title: 'Database',
                path: '/docs/sdk/database',
                id: 'database',
                icon: Database,
            },
            {
                title: 'Testing',
                path: '/docs/sdk/testing',
                id: 'testing',
                icon: FlaskConical,
            },
            {
                title: 'Build & Publish',
                path: '/docs/sdk/building',
                id: 'building',
                icon: Rocket,
            },
        ],
    },
    {
        title: 'XML Pages',
        items: [
            {
                title: 'Overview',
                path: '/docs/xml',
                id: 'xml-overview',
                icon: FileCode2,
            },
            {
                title: 'Layout',
                path: '/docs/xml/layout',
                id: 'layout',
                icon: LayoutTemplate,
            },
            {
                title: 'Components',
                path: '/docs/xml/components',
                id: 'components',
                icon: Blocks,
            },
        ],
    },
];
