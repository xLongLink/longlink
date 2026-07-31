import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Package } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';
import { GitHub } from '@/svg/GitHub';
import { LinkedIn } from '@/svg/LinkedIn';

/** Renders the public landing page footer. */
export function Footer() {
    return (
        <Stack as="footer" padding={4} paddingBlock={6}>
            <Center axis="horizontal" width="100%">
                <Card maxWidth={620} padding={4} width="100%">
                    <Stack gap={3}>
                        <Stack direction="horizontal" gap={4} hAlign="between" vAlign="center" wrap="wrap">
                            <Stack direction="horizontal" gap={4} vAlign="center">
                                <Link href="/" label="LongLink home" color="inherit">
                                    <Wordmark />
                                </Link>
                                <Stack as="ul" direction="horizontal" gap={3} vAlign="center">
                                    <li>
                                        <Link
                                            as="a"
                                            className="hover:!text-primary"
                                            color="secondary"
                                            href="https://www.linkedin.com/company/longlink"
                                            label="LinkedIn"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <LinkedIn aria-hidden="true" className="size-4" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            as="a"
                                            className="hover:!text-primary"
                                            color="secondary"
                                            href="https://github.com/xLongLink/longlink"
                                            label="GitHub"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <GitHub aria-hidden="true" className="size-4" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            as="a"
                                            className="hover:!text-primary"
                                            color="secondary"
                                            href="https://pypi.org/project/longlink/"
                                            label="PyPI"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Package aria-hidden="true" size={16} />
                                        </Link>
                                    </li>
                                </Stack>
                            </Stack>

                            <Stack as="nav" direction="horizontal" gap={4} wrap="wrap" aria-label="Footer navigation">
                                <Link
                                    href="/"
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    type="supporting"
                                    weight="medium"
                                >
                                    Home
                                </Link>
                                <Link
                                    href="/docs"
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    type="supporting"
                                    weight="medium"
                                >
                                    Documentation
                                </Link>
                                <Link
                                    href="/pricing"
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    type="supporting"
                                    weight="medium"
                                >
                                    Pricing
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
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    type="supporting"
                                    weight="medium"
                                >
                                    Impressum
                                </Link>
                                <Link
                                    href="/terms"
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    type="supporting"
                                    weight="medium"
                                >
                                    Terms
                                </Link>
                                <Link
                                    href="/privacy"
                                    className="hover:!text-primary hover:[&_.astryx-text]:!text-primary hover:!no-underline"
                                    color="secondary"
                                    type="supporting"
                                    weight="medium"
                                >
                                    Privacy
                                </Link>
                            </Stack>
                        </Stack>
                    </Stack>
                </Card>
            </Center>
        </Stack>
    );
}
