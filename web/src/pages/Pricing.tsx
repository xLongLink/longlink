import Layout from '@/Layout';
import { buttonVariants } from '@ui/button';
import { Check, CreditCard, Handshake, Rocket } from 'lucide-react';
import { Link } from 'react-router';

/** Renders the public pricing page. */
export default function Pricing() {
    return (
        <Layout>
            <main className="mx-auto w-full max-w-[1000px] px-6 py-16">
                <section className="space-y-6 text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Pricing</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                        Choose the path that fits your rollout.
                    </h1>
                    <p className="mx-auto max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                        LongLink is designed for teams that want a clean public presence now and room to scale into a
                        shared platform later.
                    </p>
                </section>

                <section className="mt-14 grid gap-4 lg:grid-cols-3">
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                        <Rocket className="h-5 w-5 text-accent" />
                        <h2 className="mt-4 text-xl font-semibold">Pilot</h2>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                            For early teams validating the shared runtime and public shell.
                        </p>
                        <p className="mt-5 text-3xl font-semibold">Contact us</p>
                        <ul className="mt-6 space-y-3 text-sm text-white/75">
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-accent" />
                                Public landing and docs-aligned branding
                            </li>
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-accent" />
                                Auth-aware app runtime
                            </li>
                        </ul>
                    </article>

                    <article className="rounded-3xl border border-accent/30 bg-accent/10 p-6 ring-1 ring-accent/20">
                        <CreditCard className="h-5 w-5 text-accent" />
                        <h2 className="mt-4 text-xl font-semibold">Team</h2>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                            For production teams that need a cohesive platform across public and private pages.
                        </p>
                        <p className="mt-5 text-3xl font-semibold">Contact us</p>
                        <ul className="mt-6 space-y-3 text-sm text-white/75">
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-accent" />
                                Shared shell across key routes
                            </li>
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-accent" />
                                Consistent navigation and footer
                            </li>
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-accent" />
                                Docs-first onboarding
                            </li>
                        </ul>
                    </article>

                    <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                        <Handshake className="h-5 w-5 text-accent" />
                        <h2 className="mt-4 text-xl font-semibold">Enterprise</h2>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                            For larger deployments that need rollout planning and tailored support.
                        </p>
                        <p className="mt-5 text-3xl font-semibold">Contact us</p>
                        <ul className="mt-6 space-y-3 text-sm text-white/75">
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-accent" />
                                Deployment guidance
                            </li>
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-accent" />
                                Governance-focused workflows
                            </li>
                        </ul>
                    </article>
                </section>

                <section className="mt-14 flex flex-wrap items-center justify-center gap-3">
                    <Link to="/playground" className={buttonVariants({ size: 'lg' })}>
                        Open playground
                    </Link>
                    <a
                        href="https://docs.longlink.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: 'outline', size: 'lg' })}
                    >
                        Read the docs
                    </a>
                </section>
            </main>
        </Layout>
    );
}
