import { Package } from 'lucide-react';
import { Link } from '@/components/astryx/Link';
import { Text } from '@/components/astryx/Text';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@/components/astryx/Stack';
import { Divider } from '@/components/astryx/Divider';
import { GitHubIcon } from '@/components/svg/GitHubIcon';
import { LinkedInIcon } from '@/components/svg/LinkedInIcon';

/** Renders the public footer at the page's content width. */
export function Footer({ maxWidth = 1000 }: { maxWidth?: number }) {
    return (
        <Stack as="footer" className="border-t border-border" paddingInline={6} paddingBlock={10}>
            <Stack className="mx-auto max-sm:text-center" maxWidth={maxWidth} width="100%" gap={6}>
                <Stack
                    className="max-sm:flex-col max-sm:justify-center"
                    direction="horizontal"
                    gap={4}
                    hAlign="between"
                    vAlign="center"
                    wrap="wrap"
                >
                    <Stack className="max-sm:flex-col" direction="horizontal" gap={4} vAlign="center">
                        <Link href="/" label="LongLink home" color="inherit">
                            <Wordmark size="heading" />
                        </Link>
                        <Stack as="ul" direction="horizontal" gap={3} vAlign="center">
                            <li>
                                <Link
                                    as="a"
                                    color="secondary"
                                    href="https://www.linkedin.com/company/longlink"
                                    label="LinkedIn"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    <LinkedInIcon aria-hidden="true" className="size-4" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    as="a"
                                    color="secondary"
                                    href="https://github.com/xLongLink/longlink"
                                    label="GitHub"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    <GitHubIcon aria-hidden="true" className="size-4" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    as="a"
                                    color="secondary"
                                    href="https://pypi.org/project/longlink/"
                                    label="PyPI"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    <Package aria-hidden="true" size={16} />
                                </Link>
                            </li>
                        </Stack>
                    </Stack>

                    <Stack
                        as="nav"
                        direction="horizontal"
                        gap={4}
                        hAlign="center"
                        wrap="wrap"
                        aria-label="Footer navigation"
                    >
                        <Link href="/docs/" color="secondary" type="supporting" weight="medium">
                            Documentation
                        </Link>
                        <Link href="/blog/" color="secondary" type="supporting" weight="medium">
                            Blog
                        </Link>
                        <Link href="/pricing/" color="secondary" type="supporting" weight="medium">
                            Pricing
                        </Link>
                        <Link href="/login/" color="secondary" type="supporting" weight="medium">
                            Sign In
                        </Link>
                    </Stack>
                </Stack>

                <Divider />

                <Stack
                    className="max-sm:flex-col max-sm:justify-center"
                    direction="horizontal"
                    gap={3}
                    hAlign="between"
                    vAlign="center"
                    wrap="wrap"
                >
                    <Text className="max-sm:order-last" type="supporting">
                        LongLink LLC - 2026 - {import.meta.env.VERSION ?? 'v0.0.0'}
                    </Text>
                    <Stack
                        as="nav"
                        direction="horizontal"
                        gap={4}
                        hAlign="center"
                        wrap="wrap"
                        aria-label="Legal navigation"
                    >
                        <Link href="mailto:info@longlink.dev" color="secondary" type="supporting" weight="medium">
                            Contact
                        </Link>
                        <Link href="/impressum/" color="secondary" type="supporting" weight="medium">
                            Impressum
                        </Link>
                        <Link href="/terms/" color="secondary" type="supporting" weight="medium">
                            Terms
                        </Link>
                        <Link href="/privacy/" color="secondary" type="supporting" weight="medium">
                            Privacy
                        </Link>
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    );
}
