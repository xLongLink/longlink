import type { ReactNode } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { PageContainer } from '@/components/PageContainer';
import TopLayout, { type TopLayoutTab } from '@/layout/TopLayout';

/** Renders the XML build shell with SDK-specific header chrome. */
export default function XmlLayout({
    activeTab,
    tabs,
    children,
}: {
    activeTab?: string;
    tabs: TopLayoutTab[];
    children: ReactNode;
}) {
    // Keep XML page content aligned within the centered application container.
    return (
        <TopLayout
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
        </TopLayout>
    );
}
