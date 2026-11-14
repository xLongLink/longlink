import { Page } from '@/components/page';
import * as pricing from '@/platform/pricing';
import { Grid } from '@/components/custom/grid';
import { Separator } from '@/components/shadcn/separator';
import { Database, HardDrive, UsersRound } from 'lucide-react';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

/** Publishes usage pricing from generated backend defaults without introducing plans. */
export default function Pricing() {
    return (
        <Page
            description="Usage-based pricing for LongLink, with free users and storage included."
            title="Pricing | LongLink"
        >
            <main>
                <section className="p-6">
                    <Stack className="mx-auto" width="100%" maxWidth={1000} gap={10} align="center">
                        <Stack gap={3} align="center">
                            <Heading
                                level={1}
                                className="text-5xl font-semibold text-balance text-center tracking-wide"
                            >
                                Pricing
                            </Heading>
                            <Text as="p" className="text-muted-foreground">
                                Billed per Organization
                            </Text>
                        </Stack>
                        <Grid columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={0} width="100%">
                            {pricing.resources.map((resource) => {
                                const ResourceIcon =
                                    resource.id === 'users'
                                        ? UsersRound
                                        : resource.id === 'database'
                                          ? Database
                                          : HardDrive;

                                return (
                                    <div
                                        key={resource.id}
                                        className="-mb-px -mr-px min-w-0 overflow-clip rounded-none border border-border bg-transparent p-6"
                                    >
                                        <Stack gap={6} paddingBlock={10} align="center">
                                            <Stack gap={3} align="center">
                                                <ResourceIcon aria-hidden className="text-primary" size={20} />
                                                <Heading level={2} className="text-center">
                                                    {resource.resource}
                                                </Heading>
                                            </Stack>
                                            <Separator className="data-[orientation=horizontal]:w-1/3" />
                                            <Stack gap={2} align="center">
                                                <Text as="p" className="font-semibold text-center">
                                                    {resource.publicIncluded}
                                                </Text>
                                                <Text as="p" className="text-muted-foreground text-center">
                                                    Included free
                                                </Text>
                                            </Stack>
                                            <Separator className="data-[orientation=horizontal]:w-1/3" />
                                            <Stack gap={2} align="center">
                                                <Text as="p" className="font-semibold text-center">
                                                    {resource.rate}
                                                </Text>
                                                <Text as="p" className="text-xs text-center text-muted-foreground">
                                                    Per month, above included usage
                                                </Text>
                                            </Stack>
                                        </Stack>
                                    </div>
                                );
                            })}
                        </Grid>
                        <Button href="/user/organizations/" label="Get started" variant="default" />
                        <Text as="p" className="text-xs text-center text-muted-foreground">
                            LongLink is currently in beta. Pricing, limits, and included usage may change.
                        </Text>
                    </Stack>
                </section>
            </main>
        </Page>
    );
}
