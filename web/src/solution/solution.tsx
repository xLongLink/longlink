import { DevelopmentProfile } from '@/solution/profile';
import { PathBreadcrumb } from '@/components/ui/breadcrumbs';
import { SolutionPage } from '@/components/ui/solution-page';
import { NativeLink as Link } from '@/components/custom/native-link';

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
