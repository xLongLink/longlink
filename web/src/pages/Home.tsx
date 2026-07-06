import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { buttonVariants } from '@/components/ui/button';
import {
    ArrowRight,
    Braces,
    CheckCircle2,
    Code2,
    Database,
    Fingerprint,
    Mail,
    Rocket,
    Server,
    Wrench,
} from 'lucide-react';
import type { CSSProperties, SVGProps } from 'react';
import { Link } from 'react-router';

/** Renders the FastAPI mark used in the Python card. */
const FastAPI = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} preserveAspectRatio="xMidYMid" viewBox="0 0 256 256">
        <path
            d="M128 0C57.33 0 0 57.33 0 128s57.33 128 128 128 128-57.33 128-128S198.67 0 128 0Zm-6.67 230.605v-80.288H76.699l64.128-124.922v80.288h42.966L121.33 230.605Z"
            fill="#009688"
        />
    </svg>
);

/** Renders the Python mark used in the Python card. */
const Python = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="16 16 32 32">
        <path
            fill="url(#python__a)"
            d="M31.885 16c-8.124 0-7.617 3.523-7.617 3.523l.01 3.65h7.752v1.095H21.197S16 23.678 16 31.876c0 8.196 4.537 7.906 4.537 7.906h2.708v-3.804s-.146-4.537 4.465-4.537h7.688s4.32.07 4.32-4.175v-7.019S40.374 16 31.885 16zm-4.275 2.454a1.394 1.394 0 1 1 0 2.79 1.393 1.393 0 0 1-1.395-1.395c0-.771.624-1.395 1.395-1.395z"
        />
        <path
            fill="url(#python__b)"
            d="M32.115 47.833c8.124 0 7.617-3.523 7.617-3.523l-.01-3.65H31.97v-1.095h10.832S48 40.155 48 31.958c0-8.197-4.537-7.906-4.537-7.906h-2.708v3.803s.146 4.537-4.465 4.537h-7.688s-4.32-.07-4.32 4.175v7.019s-.656 4.247 7.833 4.247zm4.275-2.454a1.393 1.393 0 0 1-1.395-1.395 1.394 1.394 0 1 1 1.395 1.395z"
        />
        <defs>
            <linearGradient
                id="python__a"
                x1="19.075"
                x2="34.898"
                y1="18.782"
                y2="34.658"
                gradientUnits="userSpaceOnUse"
            >
                <stop stopColor="#387EB8" />
                <stop offset="1" stopColor="#366994" />
            </linearGradient>
            <linearGradient
                id="python__b"
                x1="28.809"
                x2="45.803"
                y1="28.882"
                y2="45.163"
                gradientUnits="userSpaceOnUse"
            >
                <stop stopColor="#FFE052" />
                <stop offset="1" stopColor="#FFC331" />
            </linearGradient>
        </defs>
    </svg>
);

/** Renders the Pydantic mark used in the Python card. */
const Pydantic = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24">
        <path
            d="m23.826 17.316 -4.23 -5.866 -6.847 -9.496c-0.348 -0.48 -1.151 -0.48 -1.497 0l-6.845 9.494 -4.233 5.868a0.925 0.925 0 0 0 0.46 1.417l11.078 3.626h0.002a0.92 0.92 0 0 0 0.572 0h0.002l11.077 -3.626c0.28 -0.092 0.5 -0.31 0.59 -0.592a0.916 0.916 0 0 0 -0.13 -0.825h0.002ZM12.001 4.07l4.44 6.158 -4.152 -1.36c-0.032 -0.01 -0.066 -0.008 -0.098 -0.016a0.8 0.8 0 0 0 -0.096 -0.016c-0.032 -0.004 -0.062 -0.016 -0.094 -0.016s-0.062 0.012 -0.094 0.016a0.74 0.74 0 0 0 -0.096 0.016c-0.032 0.006 -0.066 0.006 -0.096 0.016L7.59 10.221l-0.026 0.008 4.44 -6.158h-0.002Zm-6.273 8.7 4.834 -1.583 0.516 -0.168v9.19L2.41 17.372l3.317 -4.6Zm7.197 7.437V11.02l5.35 1.752 3.316 4.598 -8.666 2.838Z"
            fill="currentColor"
            strokeWidth="1"
        />
    </svg>
);

const homepageCards = [
    {
        title: 'Real applications',
        description: 'Build proper backend services with explicit data, APIs, validation, actions, and pages.',
        concepts: ['Business logic', 'Structured UI', 'Workflow states'],
        icon: Code2,
        variant: null,
    },
    {
        title: 'Shared foundation',
        description: 'Move common platform concerns into LongLink instead of rebuilding them per app.',
        concepts: ['Auth', 'Organizations', 'Permissions', 'App shell'],
        icon: Fingerprint,
        variant: null,
    },
    {
        title: 'Powered by Python',
        description: 'Use the Python ecosystem for specific rules, integrations, automation, and data work.',
        concepts: ['FastAPI', 'SQLAlchemy', 'Pydantic', 'Alembic'],
        icon: Braces,
        variant: 'python',
    },
    {
        title: 'Local to production',
        description: 'Develop locally, package as an image, and run through a managed production control plane.',
        concepts: ['Scaffold', 'Test', 'Build', 'Deploy'],
        icon: Rocket,
        variant: null,
    },
    {
        title: 'Lower long-term cost',
        description: 'Centralize repeated engineering work so teams spend more time on the product itself.',
        concepts: ['Runtime', 'Storage', 'Databases', 'Operations'],
        icon: CheckCircle2,
        variant: null,
    },
    {
        title: 'Built to evolve',
        description: 'Keep workflows maintainable as business requirements, integrations, and users change.',
        concepts: ['Specific logic', 'Maintenance', 'Extensions'],
        icon: Wrench,
        variant: null,
    },
] as const;

const pythonVisualBackplates = [
    'left-[18%] top-0 size-14 opacity-45',
    'left-[6%] top-[54%] size-14 opacity-55',
    'left-[19%] bottom-0 size-14 opacity-45',
    'right-[27%] top-0 size-14 opacity-45',
    'right-[7%] bottom-0 size-14 opacity-55',
] as const;

const pythonVisualTiles = [
    {
        key: 'pydantic',
        icon: Pydantic,
        className: 'left-[16%] top-[40%] size-14',
    },
    {
        key: 'fastapi',
        icon: FastAPI,
        className: 'left-[39%] top-[18%] size-14',
    },
    {
        key: 'python',
        icon: Python,
        className: 'left-[40%] top-[64%] size-14',
    },
    {
        key: 'data',
        icon: Database,
        className: 'left-[60%] top-[54%] size-14',
    },
    {
        key: 'runtime',
        icon: Server,
        className: 'right-[8%] top-[22%] size-14',
    },
] as const;

/** Renders the dedicated visual for the Python ecosystem landing card. */
function PythonCardVisual() {
    return (
        <div aria-hidden="true" className="relative h-40 overflow-hidden bg-[#140d09]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(174,115,65,0.22),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(240,166,93,0.12),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_58%)]" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#140d09] to-transparent" />

            {pythonVisualBackplates.map((className) => (
                <div key={className} className={`absolute rounded-md bg-black/20 shadow-inner ${className}`} />
            ))}

            {pythonVisualTiles.map(({ key, icon: TileIcon, className }) => (
                <div
                    key={key}
                    className={`absolute flex items-center justify-center rounded-md border border-[#5c4030] bg-[#2a1d15]/92 text-[#f5c18b] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.35),0_0_26px_rgba(226,147,78,0.22)] ${className}`}
                >
                    <TileIcon className="size-4" strokeWidth={1.8} />
                    <span className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent" />
                </div>
            ))}

            <div className="absolute inset-x-12 bottom-5 h-px bg-gradient-to-r from-transparent via-[#c88754]/55 to-transparent" />
        </div>
    );
}

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
                            '--horizon-background': 'var(--background)',
                        } as CSSProperties
                    }
                >
                    <div
                        className="absolute inset-0"
                        style={
                            {
                                background:
                                    'radial-gradient(68% 18% at 50% 74%, color-mix(in oklch, var(--horizon-accent) 34%, var(--horizon-background) 66%) 0 4%, color-mix(in oklch, var(--horizon-accent) 20%, transparent) 24%, transparent 72%), radial-gradient(98% 30% at 50% 82%, color-mix(in oklch, var(--horizon-accent) 20%, var(--horizon-background) 80%) 0 8%, color-mix(in oklch, var(--horizon-accent) 16%, transparent) 34%, transparent 76%), linear-gradient(180deg, var(--horizon-background) 0 54%, color-mix(in oklch, var(--horizon-accent) 10%, var(--horizon-background)) 76%, var(--horizon-background) 100%)',
                            } as CSSProperties
                        }
                    />
                    <div
                        className="absolute"
                        style={
                            {
                                background: 'var(--horizon-background)',
                                boxShadow:
                                    '0 -1px 0 color-mix(in oklch, var(--horizon-accent) 50%, var(--horizon-background) 50%), 0 -18px 54px color-mix(in oklch, var(--horizon-accent) 36%, transparent), 0 -44px 130px color-mix(in oklch, var(--horizon-accent) 18%, transparent)',
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
                        className="absolute"
                        style={
                            {
                                right: '8%',
                                bottom: '11%',
                                left: '8%',
                                height: '24%',
                                background:
                                    'radial-gradient(50% 54% at 50% 100%, color-mix(in oklch, var(--horizon-accent) 22%, var(--horizon-background) 78%) 0 2%, color-mix(in oklch, var(--horizon-accent) 26%, transparent) 18%, transparent 72%)',
                                filter: 'blur(22px)',
                                opacity: 0.9,
                            } as CSSProperties
                        }
                    />
                </div>
                <section className="relative z-10 mx-auto flex w-full max-w-5xl -translate-y-16 flex-col items-center text-center sm:-translate-y-24">
                    <div className="space-y-5">
                        <h1 className="mx-auto flex max-w-4xl flex-col items-center text-center text-[1.875rem] font-medium leading-[1.02] text-foreground min-[420px]:text-[2.25rem] sm:text-6xl lg:text-7xl">
                            <span className="block whitespace-nowrap text-center">Just another dashboard</span>
                            <span className="mt-1 block whitespace-nowrap text-center">Nothing to see here</span>
                        </h1>
                        <p className="mx-auto text-sm leading-6 text-muted-foreground sm:text-lg">
                            <span className="mx-auto block">
                                Model data, validation, workflow states, screens, and actions in code.
                            </span>
                            <span className="mx-auto block">
                                LongLink handles auth, storage, deployment, and runtime.
                            </span>
                            <span className="mx-auto block">Keep apps portable across environments.</span>
                            <span className="mx-auto block">Avoid platform lock-in.</span>
                            <span className="mx-auto block">Change cleanly.</span>
                        </p>
                    </div>
                </section>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-background to-transparent" />
            </main>
            <section className="relative z-10 bg-background px-6 py-10">
                <div className="mx-auto grid w-full max-w-[1000px] auto-rows-[minmax(190px,auto)] grid-cols-1 gap-3 md:grid-cols-3">
                    {homepageCards.map(({ title, description, concepts, icon: Icon, variant }) => {
                        const isPythonCard = variant === 'python';

                        return (
                            <article
                                key={title}
                                className={`group relative overflow-hidden rounded-lg border p-5 text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors ${
                                    isPythonCard
                                        ? 'border-[#35241a] bg-[#140d09] hover:border-[#7a543a]'
                                        : 'border-border bg-card/80 hover:border-accent/50'
                                }`}
                            >
                                <div
                                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent opacity-60 ${
                                        isPythonCard ? 'via-[#d99c64]' : 'via-accent/70'
                                    } to-transparent`}
                                />
                                <div
                                    className={`absolute -right-16 -top-20 size-44 rounded-full blur-3xl transition-opacity group-hover:opacity-80 ${
                                        isPythonCard ? 'bg-[#d9945c]/12' : 'bg-accent/10'
                                    }`}
                                />

                                <div className="relative flex h-full flex-col justify-between gap-6">
                                    {isPythonCard ? null : (
                                        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background/70 text-accent">
                                            <Icon className="size-4" aria-hidden="true" />
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-medium text-card-foreground">{title}</h3>
                                            <p className="max-w-md text-sm leading-6 text-muted-foreground">
                                                {description}
                                            </p>
                                        </div>
                                        {isPythonCard ? (
                                            <PythonCardVisual />
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {concepts.map((concept) => (
                                                    <span
                                                        key={concept}
                                                        className="rounded-full border border-border bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                                                    >
                                                        {concept}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
            <section className="relative z-10 bg-background px-6 py-16 text-center">
                <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
                    <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Next step</p>
                        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-4xl">
                            Start building on LongLink
                        </h2>
                        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                            Explore the platform, build your first application, or talk to us about running LongLink for
                            your team.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <Link to="/docs/sdk" className={buttonVariants({ size: 'lg', className: 'px-4' })}>
                            Get Started
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                        <a
                            href="mailto:info@longlink.ch"
                            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'px-4' })}
                        >
                            <Mail className="size-4" aria-hidden="true" />
                            Contact us
                        </a>
                    </div>
                </div>
            </section>
            <div className="relative z-10 bg-background">
                <Footer />
            </div>
        </div>
    );
}
