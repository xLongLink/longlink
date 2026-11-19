import { BookOpen } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Box } from '@/components/longlink/layout/box';
import { Link } from '@/components/longlink/action/link';
import { Grid } from '@/components/longlink/layout/grid';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';

/** Lists articles about LongLink and building process-specific applications. */
export default function Blog() {
    // Match Pricing's centered introduction and the landing page's card spacing.
    return (
        <Page description="Ideas behind LongLink and building process-specific applications." title="Blog | LongLink">
            <main>
                <section className="p-6">
                    <Stack className="mx-auto w-full max-w-[1000px]" gap={10} align="center">
                        <Stack className="w-full text-center" gap={3} align="center">
                            <h1 className="text-5xl font-semibold text-balance text-center tracking-wide">Blog</h1>
                            <p className="text-muted-foreground text-pretty text-lg sm:text-xl">
                                Ideas, stories, and updates from LongLink
                            </p>
                        </Stack>
                        <Box width="100%">
                            <Grid columns={3} gap={4}>
                                <div className="min-w-0 overflow-clip rounded-none border border-border bg-transparent p-[calc(calc(var(--spacing)*3)-1px)]">
                                    <Stack className="min-h-80" gap={0} paddingBlock={8} align="center">
                                        <Stack gap={2} align="center">
                                            <BookOpen aria-hidden="true" className="text-primary" size={20} />
                                            <h2 className="font-semibold tracking-tight text-3xl text-center">
                                                Why LongLink
                                            </h2>
                                        </Stack>
                                        <Separator className="my-10 data-[orientation=horizontal]:w-1/3 self-center" />
                                        <p className="text-muted-foreground text-pretty text-center">
                                            The idea behind LongLink
                                        </p>
                                        <Stack gap={0} className="mt-auto pt-8" align="center">
                                            <Link href="/blog/why-longlink/" variant="primary">
                                                Read article
                                            </Link>
                                        </Stack>
                                    </Stack>
                                </div>
                                <div
                                    aria-hidden="true"
                                    className="min-h-80 min-w-0 overflow-clip rounded-none border border-border bg-transparent p-[calc(calc(var(--spacing)*3)-1px)]"
                                />
                                <div
                                    aria-hidden="true"
                                    className="min-h-80 min-w-0 overflow-clip rounded-none border border-border bg-transparent p-[calc(calc(var(--spacing)*3)-1px)]"
                                />
                            </Grid>
                        </Box>
                    </Stack>
                </section>
            </main>
        </Page>
    );
}
