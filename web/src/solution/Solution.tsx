import { DevelopmentProfile } from '@/solution/Profile';
import { SolutionPage } from '@/components/SolutionPage';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { NativeLink as Link } from '@/components/ui/NativeLink';

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
            developmentAction={<DevelopmentProfile />}
            formatTitle={(title) => (title ? `${title} | LongLink` : 'LongLink')}
        />
    );
}
