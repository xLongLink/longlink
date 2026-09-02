import { PathBreadcrumb } from '@/components/breadcrumb/Path';

const routeLabels: Record<string, string> = {
    docs: 'Documentation',
    api: 'Platform',
    sdk: 'Applications',
    views: 'Views',
};

/** Renders breadcrumbs for the current documentation URL. */
export function DocumentationBreadcrumb({ className }: { className?: string }) {
    return <PathBreadcrumb className={className} labels={routeLabels} />;
}
