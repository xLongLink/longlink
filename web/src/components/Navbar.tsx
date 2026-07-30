import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { ExternalLink } from 'lucide-react';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';
import { Wordmark } from '@/components/Wordmark';
import { useUserOrganizations, useUserProfile } from '@/hooks/use-user';

/** Renders the public landing page navigation. */
export function Navbar() {
    const t = useTranslator();
    const { user } = useUserProfile();
    const { memberships } = useUserOrganizations();
    const getStartedHref =
        user && memberships.length === 1 ? `/orgs/${memberships[0].organization.slug}` : '/organizations';

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
                            centerContent={
                                <Stack className="hidden sm:flex" direction="horizontal" gap={4} vAlign="center">
                                    <Link
                                        href="/docs"
                                        className="transition-colors hover:text-accent hover:no-underline"
                                        color="secondary"
                                        isStandalone
                                        weight="normal"
                                    >
                                        Documentation
                                    </Link>
                                    <Link
                                        href="/pricing"
                                        className="transition-colors hover:text-accent hover:no-underline"
                                        color="secondary"
                                        isStandalone
                                        weight="normal"
                                    >
                                        Pricing
                                    </Link>
                                    <Link
                                        as="a"
                                        className="inline-flex items-center gap-1 hover:text-accent"
                                        color="secondary"
                                        href="https://github.com/xLongLink/longlink"
                                        isStandalone
                                        rel="noopener noreferrer"
                                        target="_blank"
                                        weight="normal"
                                    >
                                        GitHub
                                        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                                    </Link>
                                </Stack>
                            }
                        />
                    </Card>
                </Center>
            </Stack>
        </>
    );
}
