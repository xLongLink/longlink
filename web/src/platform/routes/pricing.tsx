import { Page } from '@/components/ui/page';
import { capacityRates } from '@/lib/pricing';
import { Box } from '@/components/longlink/layout/box';
import { Link } from '@/components/longlink/action/link';
import { Grid } from '@/components/longlink/layout/grid';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Cpu, HardDrive, MemoryStick } from 'lucide-react';

const resources = [
    { resource: 'CPU', icon: Cpu, rate: `CHF ${capacityRates.cpu_monthly_price / 100} per vCPU` },
    { resource: 'RAM', icon: MemoryStick, rate: `CHF ${capacityRates.ram_gib_monthly_price / 100} per GiB` },
    { resource: 'Storage', icon: HardDrive, rate: `CHF ${capacityRates.storage_gib_monthly_price / 100} per GiB` }
];

/** Publishes monthly organization capacity pricing. */
export default function Pricing() {
    return (
        <Page description="Monthly CPU, RAM, and storage capacity pricing for LongLink." title="Pricing | LongLink">
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
                                    const ResourceIcon = resource.icon;

                                    return (
                                        <div
                                            key={resource.resource}
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
                                                    <p className="font-semibold text-center">{resource.rate}</p>
                                                    <p className="text-xs text-center text-muted-foreground">
                                                        Per month
                                                    </p>
                                                </Stack>
                                            </Stack>
                                        </div>
                                    );
                                })}
                            </Grid>
                        </Box>
                        <p className="text-sm text-center text-muted-foreground">
                            Billed at the end of the current month for the last successfully applied capacity, without
                            proration. Pending or failed changes are not billed until applied. Compute, database, and
                            file storage are independent capacities billed at these rates. GiB means 1,073,741,824
                            bytes. No per-user fees. Organizations without authorized card billing retain an unbilled
                            starter allocation. Once billing is authorized, these rates apply to all configured
                            capacities, without a starter deduction.
                        </p>
                        <Link href="/user/organizations/" variant="primary">
                            Get started
                        </Link>
                    </Stack>
                </section>
            </main>
        </Page>
    );
}
