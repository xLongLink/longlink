import { PathBreadcrumb } from '@/components/breadcrumb/Path';

const routeLabels: Record<string, string> = {
    docs: 'Documentation',
    api: 'Platform',
    sdk: 'Solutions',
    views: 'Solution Views',
};

/** Renders breadcrumbs for the current documentation URL. */
export function DocumentationBreadcrumb({ className }: { className?: string }) {
    return <PathBreadcrumb className={className} labels={routeLabels} />;
}
