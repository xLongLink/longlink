import type { ReactNode } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { PageContainer } from '@/components/PageContainer';
import Platform, { type PlatformTab } from '@/components/layouts/Platform';

/** Renders the XML build shell with SDK-specific header chrome. */
export default function XmlLayout({
    activeTab,
    tabs,
    children,
}: {
    activeTab?: string;
    tabs: PlatformTab[];
    children: ReactNode;
}) {
    // Keep XML page content aligned within the centered application container.
    return (
        <Platform
            activeTab={activeTab}
            endContent={
                <Link as="a" href="https://longlink.dev/docs" isExternalLink isStandalone>
                    Documentation
                </Link>
            }
            heading={
                <Link
                    as="a"
                    href="https://longlink.dev"
                    label="LongLink home"
                    color="inherit"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Wordmark />
                </Link>
            }
            tabs={tabs}
            topNavClassName="px-7"
        >
            <PageContainer minHeight="100%">{children}</PageContainer>
        </Platform>
    );
}
