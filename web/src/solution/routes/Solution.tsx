import { Link } from '@astryxdesign/core/Link';
import Platform from '@/platform/layouts/Platform';
import { SolutionRuntime } from '@/components/Solution';
import { PageContainer } from '@/components/PageContainer';

/** Renders an SDK solution from its local view manifest. */
export default function Solution() {
    return (
        <SolutionRuntime>
            {({ content, tabs }) => (
                <Platform
                    action={
                        <Link as="a" href="https://longlink.dev/docs" isExternalLink isStandalone>
                            Documentation
                        </Link>
                    }
                    tabs={tabs}
                >
                    <PageContainer minHeight="100%" padding={2}>
                        {content}
                    </PageContainer>
                </Platform>
            )}
        </SolutionRuntime>
    );
}
