import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { buttonVariants } from '@ui/button';
import { Blocks, Code2, Rocket, ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';

const bentoItems = [
    {
        title: 'Runtime Pages',
        description: 'Ship structured interfaces from metadata and XML without rebuilding the surrounding app shell.',
        icon: Code2,
        className: 'md:col-span-2',
    },
    {
        title: 'Access',
        description: 'Keep organization routes and authenticated workspaces behind the same control plane.',
        icon: ShieldCheck,
        className: '',
    },
    {
        title: 'Components',
        description: 'Use a shared renderer, theme tokens, and UI primitives across public and app-facing views.',
        icon: Blocks,
        className: '',
    },
    {
        title: 'Deploy',
        description: 'Package the web runtime into the API bundle while keeping SDK builds available for app delivery.',
        icon: Rocket,
        className: 'md:col-span-2',
    },
];

/** Renders the public home page. */
export default function Home() {
    return (
        <div className="min-h-screen overflow-hidden bg-background text-foreground">
            <Navbar />
            <main className="relative -mt-[84px] flex min-h-screen w-full items-center justify-center px-6 pb-10 pt-28">
                <div
                    aria-hidden="true"
                    className="absolute inset-0 overflow-hidden"
                    style={
                        {
                            '--horizon-accent': 'var(--accent)',
                        } as CSSProperties
                    }
                >
                    <div
                        className="absolute inset-0 dark:hidden"
                        style={
                            {
                                background:
                                    'radial-gradient(68% 18% at 50% 74%, color-mix(in oklch, var(--horizon-accent) 58%, white 16%) 0 4%, color-mix(in oklch, var(--horizon-accent) 44%, transparent) 24%, transparent 72%), radial-gradient(98% 30% at 50% 82%, color-mix(in oklch, var(--horizon-accent) 34%, white 8%) 0 8%, color-mix(in oklch, var(--horizon-accent) 28%, transparent) 34%, transparent 76%), linear-gradient(180deg, rgb(255 255 255) 0 54%, color-mix(in oklch, var(--horizon-accent) 10%, white) 76%, rgb(255 255 255) 100%)',
                            } as CSSProperties
                        }
                    />
                    <div
                        className="absolute inset-0 hidden dark:block"
                        style={
                            {
                                background:
                                    'radial-gradient(68% 18% at 50% 74%, color-mix(in oklch, var(--horizon-accent) 58%, white 16%) 0 4%, color-mix(in oklch, var(--horizon-accent) 44%, transparent) 24%, transparent 72%), radial-gradient(98% 30% at 50% 82%, color-mix(in oklch, var(--horizon-accent) 34%, white 8%) 0 8%, color-mix(in oklch, var(--horizon-accent) 28%, transparent) 34%, transparent 76%), linear-gradient(180deg, rgb(0 0 0) 0 54%, color-mix(in oklch, var(--horizon-accent) 14%, black) 76%, rgb(0 0 0) 100%)',
                            } as CSSProperties
                        }
                    />
                    <div
                        className="absolute dark:hidden"
                        style={
                            {
                                background: 'rgb(255 255 255)',
                                boxShadow:
                                    '0 -1px 0 color-mix(in oklch, var(--horizon-accent) 35%, black 12%), 0 -18px 54px color-mix(in oklch, var(--horizon-accent) 26%, transparent), 0 -44px 130px color-mix(in oklch, var(--horizon-accent) 16%, transparent)',
                                right: '-16%',
                                bottom: '-17%',
                                left: '-16%',
                                height: '45%',
                                borderRadius: '50% 50% 0 0',
                                transform: 'perspective(900px) rotateX(12deg)',
                                transformOrigin: 'center bottom',
                            } as CSSProperties
                        }
                    />
                    <div
                        className="absolute dark:hidden"
                        style={
                            {
                                right: '8%',
                                bottom: '11%',
                                left: '8%',
                                height: '24%',
                                background:
                                    'radial-gradient(50% 54% at 50% 100%, color-mix(in oklch, var(--horizon-accent) 22%, black 8%) 0 2%, color-mix(in oklch, var(--horizon-accent) 34%, transparent) 18%, transparent 72%)',
                                filter: 'blur(22px)',
                                opacity: 0.55,
                            } as CSSProperties
                        }
                    />
                    <div
                        className="absolute hidden dark:block"
                        style={
                            {
                                background: 'rgb(0 0 0)',
                                boxShadow:
                                    '0 -1px 0 color-mix(in oklch, var(--horizon-accent) 80%, white 12%), 0 -18px 54px color-mix(in oklch, var(--horizon-accent) 66%, transparent), 0 -44px 130px color-mix(in oklch, var(--horizon-accent) 32%, transparent)',
                                right: '-16%',
                                bottom: '-17%',
                                left: '-16%',
                                height: '45%',
                                borderRadius: '50% 50% 0 0',
                                transform: 'perspective(900px) rotateX(12deg)',
                                transformOrigin: 'center bottom',
                            } as CSSProperties
                        }
                    />
                    <div
                        className="absolute hidden dark:block"
                        style={
                            {
                                right: '8%',
                                bottom: '11%',
                                left: '8%',
                                height: '24%',
                                background:
                                    'radial-gradient(50% 54% at 50% 100%, color-mix(in oklch, var(--horizon-accent) 28%, white 12%) 0 2%, color-mix(in oklch, var(--horizon-accent) 42%, transparent) 18%, transparent 72%)',
                                filter: 'blur(22px)',
                                opacity: 0.9,
                            } as CSSProperties
                        }
                    />
                </div>
                <section className="relative z-10 mx-auto flex w-full max-w-3xl -translate-y-20 flex-col items-center text-center sm:-translate-y-28">
                    <div className="space-y-5">
                        <h1 className="mx-auto flex max-w-2xl flex-col items-center text-center text-[1.65rem] font-medium leading-[1.08] text-foreground min-[380px]:text-3xl sm:text-6xl lg:text-7xl">
                            <span className="block whitespace-nowrap text-center">Solutions for workflows,</span>
                            <span className="block whitespace-nowrap text-center">data, and validation</span>
                        </h1>
                        <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                            turns XML page definitions into authenticated web apps, with routing, metadata, access
                            control, and a shared React runtime handled by the platform.
                        </p>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <a
                            href="/auth/login/oidc"
                            className={buttonVariants({
                                size: 'lg',
                            })}
                        >
                            Get Started
                        </a>
                        <Link
                            to="/docs"
                            className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Read Documentation
                        </Link>
                    </div>
                </section>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-background to-transparent" />
            </main>
            <section className="relative z-10 bg-background px-6 pb-12">
                <div className="mx-auto grid w-full max-w-[1000px] auto-rows-[minmax(180px,auto)] grid-cols-1 gap-3 md:grid-cols-3">
                    {bentoItems.map(({ title, description, icon: Icon, className }) => (
                        <article
                            key={title}
                            className={`group relative overflow-hidden rounded-lg border border-border bg-card/80 p-5 text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors hover:border-accent/50 ${className}`}
                        >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent opacity-60" />
                            <div className="absolute -right-16 -top-20 size-44 rounded-full bg-accent/10 blur-3xl transition-opacity group-hover:opacity-80" />

                            <div className="relative flex h-full flex-col justify-between gap-8">
                                <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background/70 text-accent">
                                    <Icon className="size-4" aria-hidden="true" />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-lg font-medium text-card-foreground">{title}</h2>
                                    <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <div className="relative z-10 bg-background">
                <Footer />
            </div>
        </div>
    );
}
