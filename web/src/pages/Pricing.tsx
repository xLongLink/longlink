import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { BrainCircuit, ChevronRight, Sparkles, Users } from 'lucide-react';

const pricingOptions = [
    {
        name: 'Free',
        icon: Sparkles,
        price: 'CHF 0',
        period: '/user/month',
        description: 'Designed for small teams getting started with building and running process apps.',
        features: [
            {
                label: 'Deploy any Application',
                description:
                    'Deploy your application or find free open-source applications to start from.\n\nApplications sleep automatically when inactive, and abuse-prevention safeguards help keep the shared platform reliable.',
            },
            { label: '100MB Database Space', description: 'Shared across all apps in the workspace.' },
            { label: '2GB Object Storage Space', description: 'Shared across all apps in the workspace.' },
        ],
    },
    {
        name: 'Team',
        icon: Users,
        price: 'Coming soon',
        period: null,
        description: 'Run production apps with pricing that scales with the people using the workflow.',
        features: [{ label: 'Coming soon', description: null }],
    },
    {
        name: 'Work',
        icon: BrainCircuit,
        price: 'Coming soon',
        period: null,
        description: 'Use AI-assisted workflows to build, adapt, and operate process apps faster.',
        features: [{ label: 'Coming soon', description: null }],
    },
] as const;

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="min-h-[calc(100vh-9rem)]">
                <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6 py-12 sm:gap-16 sm:py-16">
                    <div className="mx-auto max-w-2xl space-y-3 text-center">
                        <p className="text-sm font-medium tracking-[0.24em] text-accent uppercase">
                            Pricing
                        </p>
                        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                            Simple workflow, Simple plans
                        </h1>
                        <p className="text-lg leading-8 text-muted-foreground">
                            Designed to be extended.
                        </p>
                    </div>

                    <div className="grid w-full gap-4 md:grid-cols-3">
                        {pricingOptions.map((option) => {
                            const TierIcon = option.icon;

                            return (
                                <article
                                    key={option.name}
                                    className="flex min-h-[38rem] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                                >
                                    <div className="flex flex-col items-center px-6 pt-8 pb-7 text-center">
                                        <div className="mb-5 flex size-9 items-center justify-center text-muted-foreground">
                                            <TierIcon aria-hidden={true} className="size-5" />
                                        </div>
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

                                        <div className="mt-6 flex min-h-20 items-end justify-center gap-2">
                                            <span className="text-5xl font-semibold tracking-tight">{option.price}</span>
                                            {option.period ? (
                                                <span className="pb-1 text-sm text-muted-foreground">{option.period}</span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-col border-t border-border bg-muted/20 px-6 py-8">
                                        {option.name === 'Team' ? (
                                            <p className="mb-5 text-sm text-foreground">Everything included in Free, plus...</p>
                                        ) : null}
                                        {option.name === 'Work' ? (
                                            <p className="mb-5 text-sm text-foreground">Everything included in Team, plus...</p>
                                        ) : null}

                                        {option.features.length ? (
                                            <ul className="space-y-4 text-sm text-muted-foreground">
                                                {option.features.map((feature) => (
                                                    <li key={feature.label} className="flex gap-3">
                                                        {feature.description ? (
                                                            <details className="group flex-1">
                                                                <summary className="flex cursor-pointer list-none gap-3 text-left text-foreground transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                                                                    <ChevronRight className="mt-0.5 size-4 shrink-0 transition-transform group-open:rotate-90" strokeWidth={1.8} />
                                                            <span className="text-foreground">{feature.label}</span>
                                                                </summary>
                                                                <p className="mt-2 whitespace-pre-line pl-7 text-xs leading-5 text-muted-foreground">
                                                                    {feature.description}
                                                                </p>
                                                            </details>
                                                        ) : (
                                                            <>
                                                                <ChevronRight className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
                                                                <span>{feature.label}</span>
                                                            </>
                                                        )}
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
                        LongLink is currently in beta. Pricing, limits, and included features may change as the platform
                        evolves.
                    </p>
                </section>
            </main>
            <Footer />
        </div>
    );
}
