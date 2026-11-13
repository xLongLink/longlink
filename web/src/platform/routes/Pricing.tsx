import { Page } from '@/components/Page';
import { Grid } from '@/components/ui/Grid';
import * as pricing from '@/platform/pricing';
import { Divider } from '@/components/ui/Divider';
import { Database, HardDrive, UsersRound } from 'lucide-react';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeButton as Button } from '@/components/ui/NativeButton';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';

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
                                className="font-(family-name:--font-family-handwritten) tracking-wide uppercase"
                                justify="center"
                                level={1}
                                textWrap="balance"
                                type="display-2"
                            >
                                Pricing
                            </Heading>
                            <Text as="p" color="secondary">
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
                                                <Heading level={2} justify="center">
                                                    {resource.resource}
                                                </Heading>
                                            </Stack>
                                            <Divider className="w-1/3" />
                                            <Stack gap={2} align="center">
                                                <Text as="p" justify="center" weight="semibold">
                                                    {resource.publicIncluded}
                                                </Text>
                                                <Text as="p" color="secondary" justify="center">
                                                    Included free
                                                </Text>
                                            </Stack>
                                            <Divider className="w-1/3" />
                                            <Stack gap={2} align="center">
                                                <Text as="p" justify="center" weight="semibold">
                                                    {resource.rate}
                                                </Text>
                                                <Text as="p" type="supporting" justify="center">
                                                    Per month, above included usage
                                                </Text>
                                            </Stack>
                                        </Stack>
                                    </div>
                                );
                            })}
                        </Grid>
                        <Button href="/user/organizations/" label="Get started" variant="primary" />
                        <Text as="p" type="supporting" justify="center">
                            LongLink is currently in beta. Pricing, limits, and included usage may change.
                        </Text>
                    </Stack>
                </section>
            </main>
        </Page>
    );
}
