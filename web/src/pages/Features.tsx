import Layout from '@/Layout';
import { buttonVariants } from '@ui/button';
import { Check, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router';

/** Renders the public features page. */
export default function Features() {
    return (
        <Layout>
            <main className="mx-auto w-full max-w-[1000px] px-6 py-16">
                <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                    <div className="space-y-6">
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Features</p>
                        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                            A shared runtime for identity, apps, and public surfaces.
                        </h1>
                        <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                            LongLink keeps the public shell, authenticated app runtime, and control-plane flows aligned
                            so teams can ship faster without fragmenting the experience.
                        </p>

                        <div className="flex flex-wrap gap-3">
                            <Link to="/pricing" className={buttonVariants({ size: 'lg' })}>
                                See pricing
                            </Link>
                            <a
                                href="https://docs.longlink.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: 'outline', size: 'lg' })}
                            >
                                Read the docs
                            </a>
                        </div>
                    </div>

                    <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                            <Layers3 className="mt-0.5 h-5 w-5 text-accent" />
                            <div>
                                <h2 className="font-semibold">Shared shell</h2>
                                <p className="mt-1 text-sm leading-6 text-white/70">
                                    One layout for navigation, footer, and public pages.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                            <ShieldCheck className="mt-0.5 h-5 w-5 text-accent" />
                            <div>
                                <h2 className="font-semibold">Auth-aware routing</h2>
                                <p className="mt-1 text-sm leading-6 text-white/70">
                                    Anonymous visitors see marketing pages, while signed-in users enter the runtime.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                            <Sparkles className="mt-0.5 h-5 w-5 text-accent" />
                            <div>
                                <h2 className="font-semibold">Brand consistency</h2>
                                <p className="mt-1 text-sm leading-6 text-white/70">
                                    Web and docs share the same visual accent, logo, and public navigation.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-16 grid gap-4 md:grid-cols-3">
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                        <Check className="h-5 w-5 text-accent" />
                        <h2 className="mt-4 text-xl font-semibold">Public pages</h2>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                            Landing, legal, features, and pricing pages all use the same shell.
                        </p>
                    </article>
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                        <Check className="h-5 w-5 text-accent" />
                        <h2 className="mt-4 text-xl font-semibold">Documented flows</h2>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                            Control-plane behavior stays aligned with the docs-first product story.
                        </p>
                    </article>
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                        <Check className="h-5 w-5 text-accent" />
                        <h2 className="mt-4 text-xl font-semibold">Minimal friction</h2>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                            Clear entry points for sign-in, docs, and product exploration.
                        </p>
                    </article>
                </section>
            </main>
        </Layout>
    );
}
