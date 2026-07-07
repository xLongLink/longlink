import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const pricingOptions = [
    {
        name: 'Free',
        price: 'CHF 0',
        period: null,
        description: 'Build locally and try a small hosted sandbox with hard resource limits.',
        features: [
            'Local SDK and XML runtime',
            '100MB database and 1 DB connection',
            '2GB object storage',
            '5GB outbound bandwidth',
        ],
        action: 'Start building',
        comingSoon: false,
        featured: false,
    },
    {
        name: 'Team',
        price: 'CHF 4',
        period: '/ active user / month',
        description: 'Run production apps with pricing that scales with the people using the workflow.',
        features: [
            'CHF 4 per active user',
            '256Mi RAM and 500m CPU limit',
            '1GB database and 2GB object storage',
            '5GB outbound bandwidth included',
        ],
        action: 'Deploy an app',
        comingSoon: false,
        featured: true,
    },
    {
        name: 'Scale',
        price: 'Coming soon',
        period: null,
        description: '',
        features: [],
        action: 'Coming soon',
        comingSoon: true,
        featured: false,
    },
] as const;

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="min-h-[calc(100vh-9rem)]">
                <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-6 pt-12 pb-16 sm:pt-16 sm:pb-24">
                    <div className="mx-auto max-w-2xl space-y-3 text-center">
                        <p className="text-sm font-medium tracking-[0.24em] text-accent uppercase">
                            Pricing
                        </p>
                        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                            Simple pricing for LongLink
                        </h1>
                        <p className="text-lg leading-8 text-muted-foreground">
                            Build locally for free, then deploy production apps for CHF 4 per active user per month.
                        </p>
                    </div>

                    <div className="grid w-full gap-4 md:grid-cols-3">
                        {pricingOptions.map((option) => {
                            return (
                                <article
                                    key={option.name}
                                    className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                                >
                                    <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center">
                                        <h2 className="text-2xl font-semibold">{option.name}</h2>
                                        {option.description ? (
                                            <p className="mt-2 min-h-10 max-w-64 text-xs leading-5 text-muted-foreground">
                                                {option.description}
                                            </p>
                                        ) : (
                                            <p className="mt-2 min-h-10 max-w-64 text-xs leading-5 text-muted-foreground">
                                                Larger limits, isolation, and support for apps that need more.
                                            </p>
                                        )}

                                        <div className="mt-5 flex min-h-16 items-end justify-center gap-2">
                                            <span className="text-5xl font-semibold tracking-tight">{option.price}</span>
                                            {option.period ? (
                                                <span className="pb-1 text-sm text-muted-foreground">{option.period}</span>
                                            ) : null}
                                        </div>

                                        <Button
                                            disabled={option.comingSoon}
                                            className="mt-5 w-full"
                                            variant={option.featured ? 'default' : 'outline'}
                                        >
                                            {option.action}
                                        </Button>
                                    </div>

                                    <div className="flex flex-1 flex-col border-t border-border bg-muted/20 px-6 py-6">
                                        {option.name === 'Team' ? (
                                            <p className="mb-5 text-sm text-foreground">Everything included in Free, plus...</p>
                                        ) : null}
                                        {option.name === 'Scale' ? (
                                            <p className="mb-5 text-sm text-foreground">For larger production deployments...</p>
                                        ) : null}

                                        {option.features.length ? (
                                            <ul className="space-y-4 text-sm text-muted-foreground">
                                                {option.features.map((feature) => (
                                                    <li key={feature} className="flex gap-3">
                                                        <ChevronRight className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm leading-6 text-muted-foreground">
                                                More compute, storage, bandwidth, retention, and isolation options will be
                                                available before launch.
                                            </p>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <p className="max-w-3xl text-center text-sm leading-6 text-muted-foreground">
                        Included limits keep the shared platform predictable. Apps that need more compute, database,
                        storage, bandwidth, retention, or isolation can move to a larger plan when available.
                    </p>
                </section>
            </main>
            <Footer />
        </div>
    );
}
