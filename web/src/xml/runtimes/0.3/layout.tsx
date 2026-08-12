import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Wordmark } from '@/components/Wordmark';
import TopLayout from '@/layout/TopLayout';

type XmlLayoutTab = {
    href: string;
    active?: boolean;
    icon?: LucideIcon;
};

/** Renders the XML build shell with SDK-specific header chrome. */
export default function XmlLayout({
    tabs,
    children,
}: {
    tabs: Record<string, XmlLayoutTab>;
    children: ReactNode;
}) {
    const t = useTranslator();
    let activeHref = '';
    const resolvedTabs = Object.entries(tabs).map(([label, tab]) => {
        const { href, active, icon } = tab;

        if (!activeHref && active) activeHref = href;

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
                    {t('common.documentation')}
                </Link>
            }
            heading={
                <Link
                    as="a"
                    href="https://longlink.dev"
                    label={t('common.longlinkHome')}
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
