import { Page } from '@/components/ui/page';
import { Box } from '@/components/longlink/layout/box';
import { Grid } from '@/components/longlink/layout/grid';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Database, HardDrive, UsersRound } from 'lucide-react';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { buttonVariants } from '@/components/longlink/action/button';
import { NativeNavigationLink } from '@/components/custom/native-link';

// Schema defaults come from the same constants used to calculate monthly invoices.
const rates = schemas.zOrganizationUsage
    .omit({ users: true, solutions: true, max_solutions: true, stripe_enabled: true, has_payment_method: true })
    .parse({});

const resources = [
    {
        id: 'users',
        resource: 'Users',
        publicIncluded: `First ${rates.free_users} users`,
        rate: `CHF ${(rates.user_monthly_price / 100).toFixed(2)} per additional user`
    },
    {
        id: 'database',
        resource: 'Database',
        publicIncluded: `${rates.free_database_bytes / 1024 ** 2} MiB database storage`,
        rate: `CHF ${(Number(rates.database_mib_monthly_price) / 100).toFixed(3)} per additional MiB`
    },
    {
        id: 'storage',
        resource: 'File storage',
        publicIncluded: `${rates.free_storage_bytes / 1024 ** 3} GiB file storage`,
        rate: `CHF ${(Number(rates.storage_mib_monthly_price) / 100).toFixed(4)} per additional MiB`
    }
];

/** Publishes usage pricing from generated backend defaults without introducing plans. */
export default function Pricing() {
    return (
        <Page
            description="Usage-based pricing for LongLink, with free users and storage included."
            title="Pricing | LongLink"
        >
            <main>
                <section className="p-6">
                    <Stack className="mx-auto w-full max-w-[1000px]" gap={10} align="center">
                        <Stack gap={3} align="center">
                            <h1 className="text-5xl font-semibold text-balance text-center tracking-wide">Pricing</h1>
                            <p className="text-muted-foreground">Billed per Organization</p>
                        </Stack>
                        <Box width="100%">
                            <Grid columns={3} gap={0}>
                                {resources.map((resource) => {
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
                                                    <h2 className="font-semibold tracking-tight text-3xl text-center">
                                                        {resource.resource}
                                                    </h2>
                                                </Stack>
                                                <Separator className="data-[orientation=horizontal]:w-1/3" />
                                                <Stack gap={2} align="center">
                                                    <p className="font-semibold text-center">
                                                        {resource.publicIncluded}
                                                    </p>
                                                    <p className="text-muted-foreground text-center">Included free</p>
                                                </Stack>
                                                <Separator className="data-[orientation=horizontal]:w-1/3" />
                                                <Stack gap={2} align="center">
                                                    <p className="font-semibold text-center">{resource.rate}</p>
                                                    <p className="text-xs text-center text-muted-foreground">
                                                        Per month, above included usage
                                                    </p>
                                                </Stack>
                                            </Stack>
                                        </div>
                                    );
                                })}
                            </Grid>
                        </Box>
                        <NativeNavigationLink href="/user/organizations/" className={buttonVariants()}>
                            Get started
                        </NativeNavigationLink>
                        <p className="text-xs text-center text-muted-foreground">
                            LongLink is currently in beta. Pricing, limits, and included usage may change.
                        </p>
                    </Stack>
                </section>
            </main>
        </Page>
    );
}
