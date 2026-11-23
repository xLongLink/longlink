import { Page } from '@/components/ui/page';
import { capacityRates } from '@/lib/pricing';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { ArrowRight, Cpu, HardDrive, Mail, MemoryStick } from 'lucide-react';

const resources = [
    { resource: 'CPU', icon: Cpu, rate: capacityRates.cpu_monthly_price / 100, unit: 'vCPU' },
    { resource: 'RAM', icon: MemoryStick, rate: capacityRates.ram_gib_monthly_price / 100, unit: 'GiB' },
    { resource: 'Storage', icon: HardDrive, rate: capacityRates.storage_gib_monthly_price / 100, unit: 'GiB' }
];

/** Publishes monthly organization capacity pricing. */
export default function Pricing() {
    return (
        <Page description="Monthly CPU, RAM, and storage capacity pricing for LongLink." title="Pricing | LongLink">
            <main>
                <section className="px-6 py-12 sm:py-20">
                    <Stack className="mx-auto w-full max-w-4xl" gap={10} align="center">
                        <Stack gap={3} align="center">
                            <h1 className="text-5xl font-semibold text-balance text-center tracking-tight">Pricing</h1>
                            <p className="text-muted-foreground">Billed per Organization</p>
                        </Stack>
                        <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
                            <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
                                {resources.map((resource) => {
                                    const ResourceIcon = resource.icon;

                                    return (
                                        <div key={resource.resource} className="min-w-0 px-8 py-8 md:py-10">
                                            <div className="mb-6 flex items-center gap-3">
                                                <ResourceIcon aria-hidden className="text-muted-foreground" size={20} />
                                                <h2 className="text-lg font-medium">{resource.resource}</h2>
                                            </div>
                                            <p className="flex items-baseline gap-2 tabular-nums">
                                                <span className="text-lg text-muted-foreground">CHF</span>
                                                <span className="text-5xl font-semibold tracking-tight">
                                                    {resource.rate}
                                                </span>
                                            </p>
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                per {resource.unit} / month
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-end border-t border-border px-6 py-6 sm:px-8">
                                <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                                    <Link variant="outline" fullWidth href="mailto:info@longlink.dev">
                                        Contact Us
                                        <Mail aria-hidden="true" size={16} />
                                    </Link>
                                    <Link variant="primary" fullWidth href="/login/">
                                        Get Started
                                        <ArrowRight aria-hidden="true" size={16} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Stack>
                </section>
            </main>
        </Page>
    );
}
