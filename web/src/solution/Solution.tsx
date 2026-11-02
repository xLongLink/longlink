import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { SolutionPage } from '@/components/SolutionPage';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';

/** Replaces the root SPA fallback metadata after the Solution route hydrates. */
export const meta = () => [];

/** Renders an SDK solution from its local view manifest. */
export default function Solution() {
    const { appearance } = useAppearance();

    return (
        <SolutionPage
            action={
                <Link as="a" href="https://www.longlink.dev/docs/" isExternalLink isStandalone>
                    Documentation
                </Link>
            }
            breadcrumb={appearance.navigation === 'sidebar' ? <PathBreadcrumb /> : <Wordmark />}
            formatTitle={(title) => (title ? `${title} | LongLink` : 'LongLink')}
        />
    );
}
