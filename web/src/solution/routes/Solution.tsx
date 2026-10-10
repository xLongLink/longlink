import { NoIndex } from '@/components/NoIndex';
import { Link } from '@astryxdesign/core/Link';
import Platform from '@/components/layouts/Platform';
import { SolutionRuntime } from '@/components/Solution';
import { PageContainer } from '@/components/PageContainer';

/** Replaces the root SPA fallback metadata after the Solution route hydrates. */
export const meta = () => [];

/** Renders an SDK solution from its local view manifest. */
export default function Solution() {
    return (
        <SolutionRuntime>
            {({ content, tabs, title }) => (
                <Platform
                    action={
                        <Link as="a" href="https://www.longlink.dev/docs/" isExternalLink isStandalone>
                            Documentation
                        </Link>
                    }
                    height="fill"
                    tabs={tabs}
                >
                    <NoIndex title={title ? `${title} | LongLink` : 'LongLink'} />
                    <PageContainer height="100%" minHeight={0} padding={2}>
                        {content}
                    </PageContainer>
                </Platform>
            )}
        </SolutionRuntime>
    );
}
