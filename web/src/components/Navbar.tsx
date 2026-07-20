import { ExternalLink } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { TopNav, TopNavItem } from '@astryxdesign/core/TopNav';
import { useTranslation } from '@/lib/i18n';
import { Wordmark } from '@/components/Wordmark';
import { useUserProfile } from '@/hooks/use-user';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

/** Renders the public landing page navigation. */
export function Navbar() {
    const { t } = useTranslation();
    const { user, organizations } = useUserProfile();
    const getStartedHref = user && organizations.length === 1 ? `/orgs/${organizations[0].slug}` : '/organizations';

    return (
        <>
            <DevelopmentNotice />
            <Stack as="header" className="relative z-20" padding={4} paddingBlock={5}>
                <Center axis="horizontal" width="100%">
                    <Card maxWidth={620} padding={0} width="100%">
                        <TopNav
                            endContent={
                                <Button
                                    href={getStartedHref}
                                    label={t('actions.getStarted')}
                                    size="sm"
                                    variant="primary"
                                />
                            }
                            heading={
                                <Link href="/" label={t('common.longlinkHome')} color="inherit">
                                    <Wordmark />
                                </Link>
                            }
                            label="Main navigation"
                            startContent={
                                <div className="hidden sm:flex">
                                    <Stack direction="horizontal" gap={1} vAlign="center">
                                        <TopNavItem href="/docs" label="Documentation" />
                                        <TopNavItem href="/pricing" label="Pricing" />
                                        <Link
                                            as="a"
                                            href="https://github.com/xLongLink/longlink"
                                            isStandalone
                                            rel="noopener noreferrer"
                                            target="_blank"
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                GitHub
                                                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                                            </span>
                                        </Link>
                                    </Stack>
                                </div>
                            }
                        />
                    </Card>
                </Center>
            </Stack>
        </>
    );
}
