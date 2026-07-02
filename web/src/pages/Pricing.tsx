import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Button } from '@ui/button';

const pricingOptions = [
    {
        name: 'Starter',
        price: 'Free',
        description: 'Build and test LongLink apps locally with the SDK.',
        features: ['Local SDK runtime', 'XML page rendering', 'SQLite and local file storage'],
        action: 'Start building',
    },
    {
        name: 'Team',
        price: 'CHF 49',
        description: 'Run small production apps with managed organization resources.',
        features: ['Managed deployments', 'Organization access control', 'Database and storage provisioning'],
        action: 'Contact sales',
    },
    {
        name: 'Platform',
        price: 'Custom',
        description: 'Operate LongLink across dedicated infrastructure and support needs.',
        features: ['Dedicated locations', 'Operations support', 'Custom deployment model'],
        action: 'Talk to us',
    },
] as const;

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="min-h-[calc(100vh-9rem)]">
                <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-20 sm:py-28">
                    <div className="max-w-2xl space-y-4">
                        <p className="text-sm font-medium tracking-[0.24em] text-accent uppercase">Pricing</p>
                        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                            Start locally, deploy when the workflow is ready.
                        </h1>
                        <p className="text-lg leading-8 text-muted-foreground">
                            Choose the level of platform support that matches your LongLink applications today.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {pricingOptions.map((option) => (
                            <article
                                key={option.name}
                                className="flex min-h-96 flex-col rounded-3xl border border-border bg-card p-6 shadow-sm"
                            >
                                <div className="space-y-3">
                                    <h2 className="text-xl font-semibold">{option.name}</h2>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-semibold tracking-tight">{option.price}</span>
                                        {option.price === 'CHF 49' ? (
                                            <span className="pb-1 text-sm text-muted-foreground">/ month</span>
                                        ) : null}
                                    </div>
                                    <p className="min-h-16 text-sm leading-6 text-muted-foreground">{option.description}</p>
                                </div>

                                <ul className="mt-8 flex-1 space-y-3 text-sm text-muted-foreground">
                                    {option.features.map((feature) => (
                                        <li key={feature} className="flex gap-3">
                                            <span className="mt-2 size-1.5 rounded-full bg-accent" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button className="mt-8 w-full" variant={option.name === 'Team' ? 'default' : 'outline'}>
                                    {option.action}
                                </Button>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
