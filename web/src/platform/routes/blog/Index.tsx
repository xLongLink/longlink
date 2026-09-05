import { Seo } from '@/components/Seo';
import { ArrowRight } from 'lucide-react';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';

const blogDescription = 'Notes on building dedicated business software with LongLink.';

/** Renders the LongLink blog index. */
export default function Blog() {
    return (
        <>
            <Seo description={blogDescription} title="Blog | LongLink" />
            <Stack as="main">
                <Section padding={6} paddingBlock={10} variant="transparent">
                    <Stack className="mx-auto" gap={10} maxWidth={1000} width="100%">
                        <Stack className="text-center" gap={3} hAlign="center" paddingBlock={8} width="100%">
                            <Heading justify="center" level={1} textWrap="balance" type="display-1">
                                The latest news
                            </Heading>
                            <Text as="p" color="secondary" textWrap="pretty">
                                Follow our journey as we build LongLink.
                            </Text>
                        </Stack>

                        <Grid columns={{ minWidth: 300, max: 2 }} gap={0}>
                            <ClickableCard
                                className="group -mb-px -mr-px overflow-hidden rounded-none bg-transparent"
                                href="/blog/introducing-longlink"
                                label="Read Introducing LongLink"
                                padding={0}
                            >
                                <Stack>
                                    <Stack className="overflow-hidden" height={160}>
                                        <img
                                            alt="Hand-drawn LongLink wordmark"
                                            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105 group-focus-within:scale-105 motion-reduce:transition-none"
                                            src="/images/introducing-longlink.png"
                                        />
                                    </Stack>
                                    <Stack gap={4} padding={6}>
                                        <Stack gap={3}>
                                            <Text color="secondary" type="supporting">
                                                September 4, 2026 | 3 min read
                                            </Text>
                                            <Heading level={2} textWrap="balance" type="display-3">
                                                Introducing LongLink
                                            </Heading>
                                        </Stack>
                                        <Stack direction="horizontal" gap={2} hAlign="end" vAlign="center" width="100%">
                                            <Text weight="medium">Read the article</Text>
                                            <Icon color="secondary" icon={ArrowRight} size="sm" />
                                        </Stack>
                                    </Stack>
                                </Stack>
                            </ClickableCard>
                        </Grid>
                    </Stack>
                </Section>
            </Stack>
        </>
    );
}
