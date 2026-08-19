import { Link } from '@astryxdesign/core/Link';
import { ApplicationRuntime } from '@/components/Application';
import { PageContainer } from '@/components/PageContainer';
import Platform from '@/platform/layouts/Platform';

/** Renders an SDK application from its local page manifest. */
export default function Application() {
    return (
        <ApplicationRuntime navigationBaseUrl="/" pagesUrl="/pages.json" requestBaseUrl="/">
            {({ content, tabs }) => (
                <Platform
                    action={
                        <Link as="a" href="https://longlink.dev/docs" isExternalLink isStandalone>
                            Documentation
                        </Link>
                    }
                    tabs={tabs}
                >
                    <PageContainer minHeight="100%">{content}</PageContainer>
                </Platform>
            )}
        </ApplicationRuntime>
    );
}
