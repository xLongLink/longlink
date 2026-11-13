import './blog.css';
import { BookOpen } from 'lucide-react';
import { Page } from '@/components/Page';
import { Grid } from '@/components/ui/Grid';
import { Divider } from '@/components/ui/Divider';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeButton as Button } from '@/components/ui/NativeButton';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';

/** Lists articles about LongLink and building process-specific applications. */
export default function Blog() {
    // Match Pricing's centered introduction and the landing page's card spacing.
    return (
        <Page description="Ideas behind LongLink and building process-specific applications." title="Blog | LongLink">
            <main>
                <section className="p-6">
                    <Stack className="mx-auto" maxWidth={1000} width="100%" gap={10} align="center">
                        <Stack className="text-center" gap={3} align="center" width="100%">
                            <Heading
                                className="tracking-wide"
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
                            <div className="blog-card">
                                <Stack className="min-h-80" gap={0} paddingBlock={8} align="center">
                                    <Stack gap={2} align="center">
                                        <BookOpen aria-hidden="true" className="text-primary" size={20} />
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
                            </div>
                            <div aria-hidden="true" className="blog-card min-h-80" />
                            <div aria-hidden="true" className="blog-card min-h-80" />
                        </Grid>
                    </Stack>
                </section>
            </main>
        </Page>
    );
}
