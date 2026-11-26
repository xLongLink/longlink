import { DevelopmentProfile } from '@/solution/profile';
import { Link } from '@/components/longlink/action/link';
import { SolutionPage } from '@/views/host/solution-page';
import { PathBreadcrumb } from '@/components/ui/breadcrumbs';

/** Replaces the root SPA fallback metadata after the Solution route hydrates. */
export const meta = () => [];

/** Renders an SDK solution from its local view manifest. */
export default function Solution() {
    return (
        <SolutionPage
            action={
                <Link href="https://www.longlink.dev/docs/" isExternalLink>
                    Documentation
                </Link>
            }
            breadcrumb={<PathBreadcrumb />}
            developmentAction={(users) => <DevelopmentProfile users={users} />}
            formatTitle={(title) => (title ? `${title} | LongLink` : 'LongLink')}
        />
    );
}
