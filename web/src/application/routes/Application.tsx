import { Link } from '@astryxdesign/core/Link';
import Platform from '@/platform/layouts/Platform';
import { PageContainer } from '@/components/PageContainer';
import { ApplicationRuntime } from '@/components/Application';

/** Renders an SDK application from its local page manifest. */
export default function Application() {
    return (
        <ApplicationRuntime>
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
        </ApplicationRuntime>
    );
}
