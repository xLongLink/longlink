import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { buttonVariants } from '@ui/button';
import { Blocks, Code2, Rocket, ShieldCheck } from 'lucide-react';

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
        <div className="min-h-screen overflow-hidden bg-black text-white">
            <Navbar />
            <main className="relative -mt-[84px] flex min-h-screen w-full items-center justify-center px-6 pb-10 pt-28">
                <div className="horizon-memory" aria-hidden="true" />
                <section className="relative z-10 mx-auto flex w-full max-w-3xl -translate-y-20 flex-col items-center text-center sm:-translate-y-28">
                    <div className="space-y-5">
                        <h1 className="mx-auto flex max-w-2xl flex-col items-center text-center text-[1.65rem] font-medium leading-[1.08] text-white min-[380px]:text-3xl sm:text-6xl lg:text-7xl">
                            <span className="block whitespace-nowrap text-center">Solutions for workflows,</span>
                            <span className="block whitespace-nowrap text-center">data, and validation</span>
                        </h1>
                        <p className="mx-auto max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                            LongLink turns XML page definitions into authenticated web apps, with routing, metadata,
                            access control, and a shared React runtime handled by the platform.
                        </p>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <a
                            href="/auth/login/oidc"
                            className={buttonVariants({
                                size: 'lg',
                                className:
                                    'h-9 rounded-md bg-white px-4 text-sm font-medium text-black shadow-[0_12px_32px_rgba(255,255,255,0.16)] hover:bg-white/90',
                            })}
                        >
                            Get Started
                        </a>
                        <a
                            href="https://docs.longlink.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-white/85 transition-colors hover:text-white"
                        >
                            Read Documentation
                        </a>
                    </div>
                </section>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-black to-transparent" />
            </main>
            <section className="relative z-10 bg-black px-6 pb-12">
                <div className="mx-auto grid w-full max-w-[1000px] auto-rows-[minmax(180px,auto)] grid-cols-1 gap-3 md:grid-cols-3">
                    {bentoItems.map(({ title, description, icon: Icon, className }) => (
                        <article
                            key={title}
                            className={`group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-md transition-colors hover:border-accent/50 ${className}`}
                        >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent opacity-60" />
                            <div className="absolute -right-16 -top-20 size-44 rounded-full bg-accent/10 blur-3xl transition-opacity group-hover:opacity-80" />

                            <div className="relative flex h-full flex-col justify-between gap-8">
                                <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-black/30 text-accent">
                                    <Icon className="size-4" aria-hidden="true" />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-lg font-medium text-white">{title}</h2>
                                    <p className="max-w-md text-sm leading-6 text-white/62">{description}</p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <div className="relative z-10 bg-black">
                <Footer />
            </div>
        </div>
    );
}
