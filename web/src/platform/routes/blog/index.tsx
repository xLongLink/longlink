import { BookOpen } from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Grid } from '@/components/custom/grid';
import { Separator } from '@/components/shadcn/separator';
import { buttonVariants } from '@/components/shadcn/button';
import { NativeNavigationLink } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';

/** Lists articles about LongLink and building process-specific applications. */
export default function Blog() {
    // Match Pricing's centered introduction and the landing page's card spacing.
    return (
        <Page description="Ideas behind LongLink and building process-specific applications." title="Blog | LongLink">
            <main>
                <section className="p-6">
                    <Stack className="mx-auto" maxWidth={1000} width="100%" gap={10} align="center">
                        <Stack className="text-center" gap={3} align="center" width="100%">
                            <h1 className="text-5xl font-semibold text-balance text-center tracking-wide">Blog</h1>
                            <p className="text-muted-foreground text-pretty text-lg sm:text-xl">
                                Ideas, stories, and updates from LongLink
                            </p>
                        </Stack>
                        <Grid columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={4} width="100%">
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
                                    <Stack className="mt-auto pt-8" align="center">
                                        <NativeNavigationLink href="/blog/why-longlink/" className={buttonVariants()}>
                                            Read article
                                        </NativeNavigationLink>
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
                    </Stack>
                </section>
            </main>
        </Page>
    );
}
