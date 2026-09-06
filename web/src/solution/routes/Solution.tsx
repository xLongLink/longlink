import { Seo } from '@/components/Seo';
import { Link } from '@astryxdesign/core/Link';
import Platform from '@/platform/layouts/Platform';
import { SolutionRuntime } from '@/components/Solution';
import { PageContainer } from '@/components/PageContainer';

/** Replaces the root SPA fallback metadata after the Solution route hydrates. */
export const meta = () => [];

/** Renders an SDK solution from its local view manifest. */
export default function Solution() {
    return (
        <SolutionRuntime>
            {({ content, isNotFound, tabs, title }) => (
                <Platform
                    action={
                        <Link as="a" href="https://longlink.dev/docs" isExternalLink isStandalone>
                            Documentation
                        </Link>
                    }
                    tabs={tabs}
                >
                    {isNotFound ? null : <Seo isIndexable={false} title={title ? `${title} | LongLink` : 'LongLink'} />}
                    <PageContainer minHeight="100%" padding={2}>
                        {content}
                    </PageContainer>
                </Platform>
            )}
        </SolutionRuntime>
    );
}
