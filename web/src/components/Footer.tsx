import { Package } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { GitHub } from '@/svg/GitHub';
import { LinkedIn } from '@/svg/LinkedIn';
import { Wordmark } from '@/components/Wordmark';

/** Scrolls public pages back to the top after internal navigation. */
function scrollToTop() {
    window.scrollTo({ left: 0, top: 0 });
}

/** Renders the public landing page footer. */
export function Footer() {
    return (
        <Stack as="footer" padding={4} paddingBlock={6}>
            <Center axis="horizontal" width="100%">
                <Card maxWidth={620} padding={4} width="100%">
                    <Stack gap={3}>
                        <Stack direction="horizontal" gap={4} hAlign="between" vAlign="center" wrap="wrap">
                            <Stack direction="horizontal" gap={4} vAlign="center">
                                <Link href="/" label="LongLink home" color="inherit" onClick={scrollToTop}>
                                    <Wordmark />
                                </Link>
                                <Stack as="ul" direction="horizontal" gap={3} vAlign="center">
                                    <li>
                                        <Link
                                            as="a"
                                            className="group"
                                            color="secondary"
                                            href="https://www.linkedin.com/company/longlink"
                                            label="LinkedIn"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span className="group-hover:text-accent">
                                                <LinkedIn aria-hidden="true" className="size-4" />
                                            </span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            as="a"
                                            className="group"
                                            color="secondary"
                                            href="https://github.com/xLongLink/longlink"
                                            label="GitHub"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span className="group-hover:text-accent">
                                                <GitHub aria-hidden="true" className="size-4" />
                                            </span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            as="a"
                                            className="group"
                                            color="secondary"
                                            href="https://pypi.org/project/longlink/"
                                            label="PyPI"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span className="group-hover:text-accent">
                                                <Package aria-hidden="true" size={16} />
                                            </span>
                                        </Link>
                                    </li>
                                </Stack>
                            </Stack>

                            <Stack as="nav" direction="horizontal" gap={4} wrap="wrap" aria-label="Footer navigation">
                                <Link
                                    href="/"
                                    className="group"
                                    color="secondary"
                                    onClick={scrollToTop}
                                    type="supporting"
                                >
                                    <span className="group-hover:text-accent">Home</span>
                                </Link>
                                <Link
                                    href="/docs"
                                    className="group"
                                    color="secondary"
                                    onClick={scrollToTop}
                                    type="supporting"
                                >
                                    <span className="group-hover:text-accent">Documentation</span>
                                </Link>
                                <Link
                                    href="/pricing"
                                    className="group"
                                    color="secondary"
                                    onClick={scrollToTop}
                                    type="supporting"
                                >
                                    <span className="group-hover:text-accent">Pricing</span>
                                </Link>
                            </Stack>
                        </Stack>

                        <Divider />

                        <Stack direction="horizontal" gap={3} hAlign="between" vAlign="center" wrap="wrap">
                            <Text type="supporting" color="secondary">
                                LongLink LLC - 2026 - {import.meta.env.VERSION ?? 'v0.0.0'}
                            </Text>
                            <Stack as="nav" direction="horizontal" gap={4} aria-label="Legal navigation">
                                <Link
                                    href="/impressum"
                                    className="group"
                                    color="secondary"
                                    onClick={scrollToTop}
                                    type="supporting"
                                >
                                    <span className="group-hover:text-accent">Impressum</span>
                                </Link>
                                <Link
                                    href="/terms"
                                    className="group"
                                    color="secondary"
                                    onClick={scrollToTop}
                                    type="supporting"
                                >
                                    <span className="group-hover:text-accent">Terms</span>
                                </Link>
                                <Link
                                    href="/privacy"
                                    className="group"
                                    color="secondary"
                                    onClick={scrollToTop}
                                    type="supporting"
                                >
                                    <span className="group-hover:text-accent">Privacy</span>
                                </Link>
                            </Stack>
                        </Stack>
                    </Stack>
                </Card>
            </Center>
        </Stack>
    );
}
