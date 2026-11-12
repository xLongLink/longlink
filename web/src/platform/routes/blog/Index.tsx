import { BookOpen } from 'lucide-react';
import { Page } from '@/components/Page';
import { Card } from '@/components/astryx/Card';
import { Grid } from '@/components/astryx/Grid';
import { Text } from '@/components/astryx/Text';
import { Stack } from '@/components/astryx/Stack';
import { Button } from '@/components/astryx/Button';
import { Divider } from '@/components/astryx/Divider';
import { Heading } from '@/components/astryx/Heading';
import { Section } from '@/components/astryx/Section';

/** Lists articles about LongLink and building process-specific applications. */
export default function Blog() {
    // Match Pricing's centered introduction and the landing page's card spacing.
    return (
        <Page description="Ideas behind LongLink and building process-specific applications." title="Blog | LongLink">
            <main>
                <Section variant="transparent" padding={6}>
                    <Stack className="mx-auto" maxWidth={1000} width="100%" gap={10} align="center">
                        <Stack className="text-center" gap={3} hAlign="center" width="100%">
                            <Heading
                                className="font-(family-name:--font-family-handwritten) tracking-wide uppercase"
                                justify="center"
                                level={1}
                                textWrap="balance"
                                type="display-2"
                            >
                                Blog
                            </Heading>
                            <Text as="p" className="text-lg sm:text-xl" color="secondary" textWrap="pretty">
                                Ideas, stories, and updates from LongLink
                            </Text>
                        </Stack>
                        <Grid columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={4} width="100%">
                            <Card className="rounded-none bg-transparent">
                                <Stack className="min-h-80" gap={0} paddingBlock={8} align="center">
                                    <Stack gap={2} align="center">
                                        <BookOpen aria-hidden="true" className="text-accent" size={20} />
                                        <Heading level={2} justify="center">
                                            Why LongLink
                                        </Heading>
                                    </Stack>
                                    <Divider className="my-10 w-1/3 self-center" />
                                    <Text as="p" color="secondary" justify="center" textWrap="pretty">
                                        The idea behind LongLink
                                    </Text>
                                    <Stack className="mt-auto pt-8" align="center">
                                        <Button href="/blog/why-longlink/" label="Read article" variant="primary" />
                                    </Stack>
                                </Stack>
                            </Card>
                            <Card aria-hidden="true" className="min-h-80 rounded-none bg-transparent" />
                            <Card aria-hidden="true" className="min-h-80 rounded-none bg-transparent" />
                        </Grid>
                    </Stack>
                </Section>
            </main>
        </Page>
    );
}
