import { Link } from '@astryxdesign/core/Link';
import { DevelopmentProfile } from '@/solution/Profile';
import { SolutionPage } from '@/components/SolutionPage';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';

/** Replaces the root SPA fallback metadata after the Solution route hydrates. */
export const meta = () => [];

/** Renders an SDK solution from its local view manifest. */
export default function Solution() {
    return (
        <SolutionPage
            action={
                <Link as="a" href="https://www.longlink.dev/docs/" isExternalLink isStandalone>
                    Documentation
                </Link>
            }
            breadcrumb={<PathBreadcrumb />}
            developmentAction={<DevelopmentProfile />}
            formatTitle={(title) => (title ? `${title} | LongLink` : 'LongLink')}
        />
    );
}
