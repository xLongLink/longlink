import { Package } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { GitHub } from '@/components/svg/GitHub';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { LinkedIn } from '@/components/svg/LinkedIn';
import { Divider } from '@astryxdesign/core/Divider';

/** Renders the public landing page footer. */
export function Footer() {
    return (
        <Stack as="footer" className="relative z-10" padding={4} paddingBlock={6}>
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
                                            color="navigation"
                                            href="https://www.linkedin.com/company/longlink"
                                            label="LinkedIn"
                                            target="_blank"
                                        >
                                            <LinkedIn aria-hidden="true" className="size-4" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            as="a"
                                            color="navigation"
                                            href="https://github.com/xLongLink/longlink"
                                            label="GitHub"
                                            target="_blank"
                                        >
                                            <GitHub aria-hidden="true" className="size-4" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            as="a"
                                            color="navigation"
                                            href="https://pypi.org/project/longlink/"
                                            label="PyPI"
                                            target="_blank"
                                        >
                                            <Package aria-hidden="true" size={16} />
                                        </Link>
                                    </li>
                                </Stack>
                            </Stack>

                            <Stack as="nav" direction="horizontal" gap={4} wrap="wrap" aria-label="Footer navigation">
                                <Link href="/" color="navigation" type="supporting" weight="medium">
                                    Home
                                </Link>
                                <Link href="/docs" color="navigation" type="supporting" weight="medium">
                                    Documentation
                                </Link>
                                <Link href="/pricing" color="navigation" type="supporting" weight="medium">
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
                                <Link href="/impressum" color="navigation" type="supporting" weight="medium">
                                    Impressum
                                </Link>
                                <Link href="/terms" color="navigation" type="supporting" weight="medium">
                                    Terms
                                </Link>
                                <Link href="/privacy" color="navigation" type="supporting" weight="medium">
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
