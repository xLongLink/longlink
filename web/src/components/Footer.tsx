import { Package } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
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
                                            href="https://www.linkedin.com/company/swissgpu"
                                            label="LinkedIn"
                                            isExternalLink
                                            tooltip="LinkedIn"
                                        >
                                            <Icon icon={LinkedIn} size="sm" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            as="a"
                                            href="https://github.com/xLongLink/longlink"
                                            label="GitHub"
                                            isExternalLink
                                            tooltip="GitHub"
                                        >
                                            <Icon icon={GitHub} size="sm" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            as="a"
                                            href="https://pypi.org/project/longlink/"
                                            label="PyPI"
                                            isExternalLink
                                            tooltip="PyPI"
                                        >
                                            <Icon icon={Package} size="sm" />
                                        </Link>
                                    </li>
                                </Stack>
                            </Stack>

                            <Stack as="nav" direction="horizontal" gap={4} wrap="wrap" aria-label="Footer navigation">
                                <Link href="/" onClick={scrollToTop} type="supporting">
                                    Home
                                </Link>
                                <Link href="/docs" onClick={scrollToTop} type="supporting">
                                    Documentation
                                </Link>
                                <Link href="/pricing" onClick={scrollToTop} type="supporting">
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
                                <Link href="/impressum" onClick={scrollToTop} type="supporting">
                                    Impressum
                                </Link>
                                <Link href="/terms" onClick={scrollToTop} type="supporting">
                                    Terms
                                </Link>
                                <Link href="/privacy" onClick={scrollToTop} type="supporting">
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
