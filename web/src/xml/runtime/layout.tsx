import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import TopLayout from '@/layout/TopLayout';
import { Wordmark } from '@/components/Wordmark';
import { PageContainer } from '@/components/PageContainer';

type XmlLayoutTab = {
    href: string;
    active?: boolean;
    icon?: LucideIcon;
};

/** Renders the XML build shell with SDK-specific header chrome. */
export default function XmlLayout({ tabs, children }: { tabs: Record<string, XmlLayoutTab>; children: ReactNode }) {
    const activeHref = Object.values(tabs).find((tab) => tab.active)?.href ?? '';
    const resolvedTabs = Object.entries(tabs).map(([label, tab]) => {
        const { href, icon } = tab;

        return {
            href,
            icon,
            label,
            value: href,
        };
    });

    // Keep XML page content aligned within the centered application container.
    return (
        <TopLayout
            activeTab={activeHref}
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
            tabs={resolvedTabs}
            topNavClassName="px-7"
        >
            <PageContainer minHeight="100%">{children}</PageContainer>
        </TopLayout>
    );
}
