import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Wordmark } from '@/components/Wordmark';

/** Renders the public landing page navigation. */
export function Navbar() {
    return (
        <Stack as="header" className="relative z-20" padding={4} paddingBlock={5}>
            <Center axis="horizontal" width="100%">
                <Card maxWidth={620} padding={0} width="100%">
                    <TopNav
                        endContent={<Button href="/organizations" label="Get Started" size="sm" variant="primary" />}
                        heading={
                            <Link href="/" label="LongLink home" color="inherit">
                                <Wordmark />
                            </Link>
                        }
                        label="Main navigation"
                        centerContent={
                            <Stack className="hidden sm:flex" direction="horizontal" gap={4} vAlign="center">
                                <Link
                                    href="/docs"
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    isStandalone
                                    weight="medium"
                                >
                                    Documentation
                                </Link>
                                <Link
                                    href="/pricing"
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    isStandalone
                                    weight="medium"
                                >
                                    Pricing
                                </Link>
                                <Link
                                    as="a"
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    href="https://github.com/xLongLink/longlink"
                                    isExternalLink
                                    isStandalone
                                    weight="medium"
                                >
                                    GitHub
                                </Link>
                            </Stack>
                        }
                    />
                </Card>
            </Center>
        </Stack>
    );
}
