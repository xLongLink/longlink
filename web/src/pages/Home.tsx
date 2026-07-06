import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Wordmark } from '@/components/Wordmark';
import { buttonVariants } from '@/components/ui/button';
import {
    Activity,
    ArrowRight,
    Bot,
    Braces,
    Building2,
    ChevronDown,
    Database,
    FileCode,
    HardDrive,
    KeyRound,
    Languages,
    Logs,
    Mail,
    PackageCheck,
    Palette,
    PanelTop,
    Play,
    Plug,
    Rocket,
    Route,
    ShieldCheck,
    Terminal,
    Users,
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
        title: 'Users, agents, and developers meet',
        description: 'One operating layer for work.',
        layoutClassName: 'md:col-span-3',
        variant: 'work',
    },
    {
        title: 'Shared foundation',
        description: 'Common platform work, handled once.',
        layoutClassName: 'md:col-span-3',
        variant: 'foundation',
    },
    {
        title: 'XML screens',
        description: 'XML turns into usable screens.',
        layoutClassName: 'md:col-span-2',
        variant: 'xml',
    },
    {
        title: 'Powered by Python',
        description: 'Use the Python ecosystem.',
        layoutClassName: 'md:col-span-2',
        variant: 'python',
    },
    {
        title: 'CLI workflow',
        description: 'Init, dev, migrate, build.',
        layoutClassName: 'md:col-span-2',
        variant: 'cli',
    },
] as const;

/** Renders the XML-to-UI showcase card visual. */
function XmlShowcaseVisual() {
    return (
        <div aria-hidden="true" className="relative h-44 overflow-hidden">
            <div className="absolute inset-0 rounded-md p-3 transition-all duration-500 ease-out group-hover:-translate-y-4 group-hover:scale-[0.97] group-hover:opacity-0">
                <div className="mb-2 flex gap-1.5">
                    <span className="size-1.5 rounded-full bg-[#d99c64]/80" />
                    <span className="size-1.5 rounded-full bg-[#84e2d1]/70" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-4 text-muted-foreground">
                    <code>{`<longlink name="Access">
  <Form title="Access request">
    <Input label="Email" />
    <Select label="Role" />
    <Button>Submit</Button>
  </Form>
</longlink>`}</code>
                </pre>
            </div>

            <div className="absolute inset-0 translate-y-6 scale-[0.96] rounded-md p-3 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
                <div className="mb-3 text-sm font-medium text-foreground">Access request</div>
                <div className="space-y-2">
                    <div className="space-y-1">
                        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            Email
                        </div>
                        <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-card-foreground">
                            alex@company.com
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            Role
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-card-foreground">
                            Reviewer
                            <ChevronDown className="size-3 text-muted-foreground" strokeWidth={1.8} />
                        </div>
                    </div>
                    <div className="inline-flex rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
                        Submit
                    </div>
                </div>
            </div>
        </div>
    );
}

const pythonOrbitLibraries = [
    {
        key: 'FastAPI',
        icon: FastAPI,
        className: 'left-[70%] top-[18%]',
    },
    {
        key: 'Pydantic',
        icon: Pydantic,
        className: 'left-[22%] top-[66%]',
    },
    {
        key: 'SQLAlchemy',
        icon: Database,
        className: 'left-[78%] top-[62%]',
    },
    {
        key: 'Alembic',
        icon: Wrench,
        className: 'left-[25%] top-[22%]',
    },
] as const;

const foundationVisualColumns = [
    [
        { key: 'authentication', icon: KeyRound },
        { key: 'theming', icon: Palette },
        { key: 'routing', icon: Route },
    ],
    [
        { key: 'organizations', icon: Building2 },
        { key: 'app-shell', icon: PanelTop },
        { key: 'deployment', icon: Rocket },
    ],
    [
        { key: 'permissions', icon: ShieldCheck },
        { key: 'databases', icon: Database },
        { key: 'logs', icon: Logs },
    ],
    [
        { key: 'languages', icon: Languages },
        { key: 'storage', icon: HardDrive },
        { key: 'status', icon: Activity },
    ],
] as const;

const cliWorkflowSteps = [
    {
        command: 'init',
        result: 'scaffold',
        icon: Terminal,
        className: 'left-1/2 top-[8%] -translate-x-1/2',
    },
    {
        command: 'dev',
        result: 'local',
        icon: Play,
        className: 'right-[3%] top-1/2 -translate-y-1/2',
    },
    {
        command: 'migrate',
        result: 'schema',
        icon: Database,
        className: 'bottom-[8%] left-1/2 -translate-x-1/2',
    },
    {
        command: 'build',
        result: 'image',
        icon: PackageCheck,
        className: 'left-[3%] top-1/2 -translate-y-1/2',
    },
] as const;

const workNetworkNodes = [
    {
        label: 'Users',
        icon: Users,
        className: 'left-[4%] top-[5%]',
    },
    {
        label: 'Agents',
        icon: Bot,
        className: 'left-[4%] top-1/2 -translate-y-1/2',
    },
    {
        label: 'Developers',
        icon: FileCode,
        className: 'bottom-[5%] left-[4%]',
    },
    {
        label: 'Integrations',
        icon: Plug,
        className: 'right-[4%] top-[5%]',
    },
    {
        label: 'Data',
        icon: Database,
        className: 'right-[4%] top-1/2 -translate-y-1/2',
    },
    {
        label: 'APIs',
        icon: Braces,
        className: 'bottom-[5%] right-[4%]',
    },
] as const;

/** Renders the dedicated visual for the shared platform foundation card. */
function FoundationCardVisual() {
    return (
        <div aria-hidden="true" className="relative h-40 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4cc7b1]/8 blur-2xl" />
            <div className="relative z-10 grid h-full grid-cols-4 px-7 py-3">
                {foundationVisualColumns.map((tiles, columnIndex) => (
                    <div
                        key={tiles.map(({ key }) => key).join('-')}
                        className={`flex flex-col items-center justify-center gap-2 ${
                            columnIndex % 2 === 0 ? '-translate-y-[18px]' : 'translate-y-[18px]'
                        }`}
                    >
                        {tiles.map(({ key, icon: TileIcon }) => (
                            <div
                                key={key}
                                className="relative flex size-9 items-center justify-center rounded-md border border-[#29534d] bg-[#14211f]/92 text-[#84e2d1] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.35),0_0_26px_rgba(70,190,170,0.16)]"
                            >
                                <TileIcon
                                    className="size-4 transition-transform duration-300 group-hover:scale-110"
                                    strokeWidth={1.8}
                                />
                                <span className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {['left-[22%] top-[25%]', 'left-[47%] top-[30%]', 'right-[18%] top-[23%]', 'left-[54%] bottom-[22%]'].map(
                (className) => (
                    <div
                        key={className}
                        className={`absolute size-9 rounded-md bg-black/12 shadow-inner ${className}`}
                    />
                )
            )}
        </div>
    );
}

/** Renders the dedicated visual for the LongLink CLI workflow card. */
function CliCardVisual() {
    return (
        <div aria-hidden="true" className="relative h-40 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#d9b469]/30 transition-transform duration-700 group-hover:rotate-45" />
            <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8d713d]/28 bg-[#d9b469]/6" />
            <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 group-hover:animate-[spin_4s_linear_infinite]">
                <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-[#f4c878] shadow-[0_0_18px_rgba(244,200,120,0.65)]" />
            </div>

            <div className="absolute left-1/2 top-1/2 z-20 flex size-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#6a5430] bg-[#2a2114]/95 text-[#f4c878] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_16px_36px_rgba(0,0,0,0.38),0_0_28px_rgba(215,171,89,0.18)]">
                <Terminal
                    className="size-4 transition-transform duration-300 group-hover:scale-110"
                    strokeWidth={1.8}
                />
                <span className="mt-1 font-mono text-[9px] leading-none text-[#f1d79b]">longlink</span>
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
            </div>

            {cliWorkflowSteps.map(({ command, result, icon: StepIcon, className }) => (
                <div
                    key={command}
                    className={`absolute z-20 flex min-w-[76px] items-center gap-1.5 rounded-full border border-[#4b3d25] bg-[#18130d]/95 px-2.5 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.32),0_0_20px_rgba(215,171,89,0.12)] ${className}`}
                >
                    <StepIcon
                        className="size-3.5 shrink-0 text-[#f4c878] transition-transform duration-300 group-hover:scale-110"
                        strokeWidth={1.8}
                    />
                    <div className="min-w-0">
                        <div className="font-mono text-[10px] leading-3 text-[#f1d79b]">{command}</div>
                        <div className="text-[9px] leading-3 text-muted-foreground">{result}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Renders the dedicated visual for the LongLink work network card. */
function WorkNetworkVisual() {
    return (
        <div aria-hidden="true" className="relative h-40 overflow-hidden">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 160">
                <path
                    d="M78 24 C108 28 120 58 132 80 M78 80 H132 M78 136 C108 132 120 102 132 80 M242 24 C212 28 200 58 188 80 M242 80 H188 M242 136 C212 132 200 102 188 80"
                    fill="none"
                    stroke="#e49aaa"
                    strokeLinecap="round"
                    strokeWidth="1.2"
                    strokeDasharray="4 6"
                    className="opacity-40 transition-opacity duration-300 group-hover:opacity-80"
                />
            </svg>

            <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-[#6a3e49] bg-[#181013]/95 px-5 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_16px_36px_rgba(0,0,0,0.38),0_0_30px_rgba(224,151,166,0.2)]">
                <Wordmark className="text-sm" />
                <span className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent" />
            </div>

            {workNetworkNodes.map(({ label, icon: NodeIcon, className }) => (
                <div
                    key={label}
                    className={`absolute z-20 flex min-w-[84px] items-center gap-1.5 rounded-full border border-[#56333d] bg-[#181013]/95 px-2.5 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.32),0_0_20px_rgba(224,151,166,0.12)] ${className}`}
                >
                    <NodeIcon
                        className="size-3.5 shrink-0 text-[#f0a6b6] transition-transform duration-300 group-hover:scale-110"
                        strokeWidth={1.8}
                    />
                    <span className="text-[10px] font-medium leading-3 text-[#f6c0ca]">{label}</span>
                </div>
            ))}
        </div>
    );
}

/** Renders the dedicated visual for the Python ecosystem landing card. */
function PythonCardVisual() {
    return (
        <div aria-hidden="true" className="relative h-40 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6d472c]/35 bg-[#8f5424]/10" />
            <div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8a5a35]/45 bg-[#b16a2e]/10" />
            <div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#a8683a]/55 bg-[#c77735]/12" />
            <div className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 bg-[#8a5a35]/35" />
            <div className="absolute left-1/2 top-1/2 h-40 w-px -translate-y-1/2 bg-[#8a5a35]/35" />
            <div className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 rotate-45 bg-[#8a5a35]/25" />
            <div className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 -rotate-45 bg-[#8a5a35]/25" />

            <div className="absolute left-1/2 top-1/2 z-20 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#6a4a33] bg-[#4f3523]/95 text-[#f5c18b] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.38),0_0_34px_rgba(226,147,78,0.26)]">
                <Python className="size-6 transition-transform duration-300 group-hover:scale-110" />
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/12 to-transparent" />
            </div>

            {pythonOrbitLibraries.map(({ key, icon: LibraryIcon, className }) => (
                <div
                    key={key}
                    className={`absolute z-20 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#5c4030] bg-[#2a1d15]/90 text-[#f5c18b] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_10px_28px_rgba(0,0,0,0.35),0_0_24px_rgba(226,147,78,0.18)] ${className}`}
                >
                    <LibraryIcon
                        className="size-4 transition-transform duration-300 group-hover:scale-110"
                        strokeWidth={1.8}
                    />
                    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
                </div>
            ))}
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
                            <span className="mt-1 block whitespace-nowrap text-center line-through">Nothing to see here</span>
                        </h1>
                        <p className="mx-auto text-sm leading-6 text-muted-foreground sm:text-lg">
                            <span className="mx-auto block">The narrative has changed, but you are still buying the old story</span>
                            <span className="mx-auto block tracking-[-0.012em]">The economics have shifted; flexibility now lives in code</span>
                            <span className="mx-auto block tracking-[0.018em]">Build the process, not the workaround</span>
                            <span className="mx-auto block tracking-[0.026em]">Start from solid ground</span>
                            <span className="mx-auto block">This is LongLink</span>
                        </p>
                    </div>
                </section>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-background to-transparent" />
            </main>
            <section className="relative z-10 bg-background px-6 py-10">
                <div className="mx-auto grid w-full max-w-[1000px] auto-rows-[minmax(190px,auto)] grid-cols-1 gap-3 md:grid-cols-6">
                    {homepageCards.map(({ title, description, layoutClassName, variant }) => {
                        const isXmlCard = variant === 'xml';
                        const isCliCard = variant === 'cli';
                        const isWorkCard = variant === 'work';
                        const isPythonCard = variant === 'python';
                        const isFoundationCard = variant === 'foundation';

                        return (
                            <article
                                key={title}
                                className={`group relative overflow-hidden rounded-lg border p-5 text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-md ${layoutClassName} ${
                                    isFoundationCard
                                        ? 'border-[#294943] bg-[#0d1214]'
                                        : isPythonCard
                                          ? 'border-[#35241a] bg-[#140d09]'
                                          : isXmlCard
                                            ? 'border-[#30343b] bg-[#101214]'
                                            : isCliCard
                                              ? 'border-[#3d3321] bg-[#12100b]'
                                              : isWorkCard
                                                ? 'border-[#3b2c32] bg-[#120d10]'
                                                : 'border-border bg-card/80'
                                }`}
                            >
                                <div
                                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent opacity-60 ${
                                        isFoundationCard
                                            ? 'via-[#84e2d1]'
                                            : isPythonCard
                                              ? 'via-[#d99c64]'
                                              : isXmlCard
                                                ? 'via-[#9aa4b2]'
                                                : isCliCard
                                                  ? 'via-[#d9b469]'
                                                  : isWorkCard
                                                    ? 'via-[#e49aaa]'
                                                    : 'via-accent/70'
                                    } to-transparent`}
                                />
                                <div
                                    className={`absolute -right-16 -top-20 size-44 rounded-full blur-3xl ${
                                        isFoundationCard
                                            ? 'bg-[#4cc7b1]/12'
                                            : isPythonCard
                                              ? 'bg-[#d9945c]/12'
                                              : isXmlCard
                                                ? 'bg-[#9aa4b2]/10'
                                                : isCliCard
                                                  ? 'bg-[#d9b469]/10'
                                                  : isWorkCard
                                                    ? 'bg-[#e49aaa]/10'
                                                    : 'bg-accent/10'
                                    }`}
                                />

                                <div className="relative flex h-full flex-col justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-medium text-card-foreground">{title}</h3>
                                            <p className="max-w-md text-sm leading-6 text-muted-foreground">
                                                {description}
                                            </p>
                                        </div>
                                        {isXmlCard ? (
                                            <XmlShowcaseVisual />
                                        ) : isCliCard ? (
                                            <CliCardVisual />
                                        ) : isWorkCard ? (
                                            <WorkNetworkVisual />
                                        ) : isFoundationCard ? (
                                            <FoundationCardVisual />
                                        ) : isPythonCard ? (
                                            <PythonCardVisual />
                                        ) : null}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
            <section className="relative z-10 bg-background px-6 py-24 text-center sm:py-28">
                <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">
                    <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Next step</p>
                        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-4xl">
                            Start building on LongLink
                        </h2>
                        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                            Explore LongLink, build an app, or talk to us.
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
