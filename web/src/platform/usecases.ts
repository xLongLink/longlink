// Keep route modules, sidebar labels, and reading order in build-safe catalogs.
export const useCasePages = [
    {
        path: '/use-cases',
        module: './routes/usecases/Introduction.tsx',
        label: 'Why LongLink',
        section: 'Introduction',
        icon: 'BookOpen',
    },
    {
        path: '/use-cases/approvals-and-decisions',
        module: './routes/usecases/Approvals.tsx',
        label: 'Approvals & decisions',
        section: 'Use cases',
        icon: 'ClipboardCheck',
    },
    {
        path: '/use-cases/operations',
        module: './routes/usecases/Operations.tsx',
        label: 'Operations',
        section: 'Use cases',
        icon: 'Settings',
    },
    {
        path: '/use-cases/compliance-and-quality',
        module: './routes/usecases/Compliance.tsx',
        label: 'Compliance & quality',
        section: 'Use cases',
        icon: 'ShieldCheck',
    },
    {
        path: '/use-cases/cases-and-projects',
        module: './routes/usecases/Cases.tsx',
        label: 'Cases & projects',
        section: 'Use cases',
        icon: 'FolderKanban',
    },
] as const;

export const comparisonPages = [
    { path: '/compare/longlink-vs-retool', module: './routes/compare/Retool.tsx', label: 'Retool', icon: 'Retool' },
    { path: '/compare/longlink-vs-lovable', module: './routes/compare/Lovable.tsx', label: 'Lovable', icon: 'Lovable' },
    {
        path: '/compare/longlink-vs-windmill',
        module: './routes/compare/Windmill.tsx',
        label: 'Windmill',
        icon: 'Windmill',
    },
    {
        path: '/compare/longlink-vs-microsoft-power-apps',
        module: './routes/compare/PowerApps.tsx',
        label: 'Microsoft Power Apps',
        icon: 'Microsoft',
    },
    { path: '/compare/longlink-vs-replit', module: './routes/compare/Replit.tsx', label: 'Replit', icon: 'Replit' },
    {
        path: '/compare/longlink-vs-appsmith',
        module: './routes/compare/Appsmith.tsx',
        label: 'Appsmith',
        icon: 'Appsmith',
    },
    {
        path: '/compare/longlink-vs-superblocks',
        module: './routes/compare/Superblocks.tsx',
        label: 'Superblocks',
        icon: 'Superblocks',
    },
    { path: '/compare/longlink-vs-fastapi', module: './routes/compare/FastAPI.tsx', label: 'FastAPI', icon: 'FastAPI' },
    { path: '/compare/longlink-vs-reflex', module: './routes/compare/Reflex.tsx', label: 'Reflex', icon: 'Reflex' },
] as const;

export const useCasePaths: string[] = useCasePages.map(({ path }) => path);

export const comparisonPaths: string[] = comparisonPages.map(({ path }) => path);
