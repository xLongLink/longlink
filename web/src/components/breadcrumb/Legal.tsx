import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';

/** Renders breadcrumbs for the current legal article URL. */
export function LegalBreadcrumb({ className }: { className?: string }) {
    return <PathBreadcrumb className={className} root={<BreadcrumbItem href="/">Home</BreadcrumbItem>} />;
}
