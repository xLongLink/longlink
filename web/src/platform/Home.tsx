import { useEffect, useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Grid } from '@astryxdesign/core/Grid';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Section } from '@astryxdesign/core/Section';
import { Heading } from '@astryxdesign/core/Heading';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
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
import { Python } from '@/svg/Python';
import { FastAPI } from '@/svg/FastAPI';
import { Pydantic } from '@/svg/Pydantic';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Wordmark } from '@/components/Wordmark';
import { HeroGlobe } from '@/platform/HeroGlobe';
import { CliWorkflowConnector } from '@/svg/CliWorkflowConnector';
import { WorkNetworkConnections } from '@/svg/WorkNetworkConnections';

const homepageCards = [
    {
        title: 'Users, agents, and developers meet',
        description: 'One operating layer for work.',
        details: ['Users', 'Agents', 'Developers', 'Integrations', 'Data', 'APIs'],
        layoutClassName: 'md:col-span-3',
        variant: 'work',
    },
    {
        title: 'Shared foundation',
        description: 'Common platform work, handled once.',
        details: [
            'Authentication',
            'Organizations',
            'Permissions',
            'Theming',
            'Application shell',
            'Databases',
            'Storage',
            'Routing',
            'Deployment',
            'Logs',
            'Status',
        ],
        layoutClassName: 'md:col-span-3',
        variant: 'foundation',
    },
    {
        title: 'XML screens',
        description: 'XML turns into usable screens.',
        details: [],
        layoutClassName: 'md:col-span-2',
        variant: 'xml',
    },
    {
        title: 'Powered by Python',
        description: 'Use the Python ecosystem.',
        details: ['FastAPI', 'Pydantic', 'SQLAlchemy', 'Alembic'],
        layoutClassName: 'md:col-span-2',
        variant: 'python',
    },
    {
        title: 'CLI workflow',
        description: 'Init, dev, migrate, build.',
        details: ['init', 'dev', 'migrate', 'build'],
        layoutClassName: 'md:col-span-2',
        variant: 'cli',
    },
] as const;

const paths = [
    {
        title: 'Use',
        description:
            'Deploy an existing application as it is. Get a proven process running without rebuilding what already exists.',
        action: 'Explore existing apps',
        href: '/marketplace',
    },
    {
        title: 'Adapt',
        description:
            'Fork an existing application and change its workflow, fields, rules, integrations, or interface around your requirements.',
        action: 'Start from a foundation',
        href: '/docs',
    },
    {
        title: 'Create',
        description:
            'Build a dedicated application when the process is uniquely yours. LongLink handles the platform; you own the application.',
        action: 'Build a new app',
        href: '/docs',
    },
] as const;

const integrationContextCount = 336_000_000;
const humanRobotHandsImage = '/human_robot_hands_vector.svg';

/** Renders the XML-to-UI showcase card visual. */
function XmlShowcaseVisual() {
    return (
        <div aria-hidden="true" className="relative h-44 overflow-hidden">
            <div className="absolute inset-0 rounded-md p-3 transition-[transform,opacity] duration-500 ease-out group-hover:-translate-y-4 group-hover:scale-[0.97] group-hover:opacity-0 motion-reduce:transition-none">
                <div className="mb-2 flex gap-1.5">
                    <span className="size-1.5 rounded-full bg-accent-bg" />
                    <span className="size-1.5 rounded-full bg-muted" />
                    <span className="size-1.5 rounded-full bg-border" />
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-4 text-secondary">
                    <code>{`<longlink name="Access">
  <TextInput label="Email" />
  <Selector label="Role">
    <SelectorOption value="reviewer" label="Reviewer" />
  </Selector>
  <Button label="Submit" />
</longlink>`}</code>
                </pre>
            </div>

            <div className="absolute inset-0 translate-y-6 scale-[0.96] rounded-md p-3 opacity-0 transition-[transform,opacity] duration-500 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none">
                <div className="mb-3 text-sm font-medium text-primary">Access request</div>
                <div className="space-y-2">
                    <div className="space-y-1">
                        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-secondary">Email</div>
                        <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-primary">
                            alex@company.com
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-secondary">Role</div>
                        <div className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-primary">
                            Reviewer
                            <ChevronDown className="size-3 text-secondary" strokeWidth={1.8} />
                        </div>
                    </div>
                    <div className="inline-flex rounded-md bg-accent-bg px-3 py-1.5 text-xs font-medium text-on-accent">
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
        { key: 'storage', icon: HardDrive },
        { key: 'status', icon: Activity },
    ],
] as const;

const cliWorkflowSteps = [
    {
        command: 'init',
        icon: Terminal,
        className: 'left-[20px] top-[12px]',
    },
    {
        command: 'dev',
        icon: Play,
        className: 'left-[76px] top-[46px]',
    },
    {
        command: 'migrate',
        icon: Database,
        className: 'left-[132px] top-[80px]',
    },
    {
        command: 'build',
        icon: PackageCheck,
        className: 'left-[188px] top-[114px]',
    },
] as const;

const cliWorkflowConnectors = [
    {
        key: 'init-dev',
        className: 'left-[26px] top-[31px]',
    },
    {
        key: 'dev-migrate',
        className: 'left-[82px] top-[65px]',
    },
    {
        key: 'migrate-build',
        className: 'left-[138px] top-[99px]',
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
            <div className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-bg/10 blur-2xl" />
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
                                className="homepage-visual-node relative flex size-9 items-center justify-center rounded-md border border-border bg-card/90 text-accent"
                            >
                                <TileIcon
                                    className="size-4 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
                                    strokeWidth={1.8}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {['left-[22%] top-[25%]', 'left-[47%] top-[30%]', 'right-[18%] top-[23%]', 'left-[54%] bottom-[22%]'].map(
                (className) => (
                    <div key={className} className={`absolute size-9 rounded-md bg-muted shadow-inner ${className}`} />
                )
            )}
        </div>
    );
}

/** Renders the dedicated visual for the LongLink CLI workflow card. */
function CliCardVisual() {
    return (
        <div aria-hidden="true" className="relative h-40 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-40 w-[280px] -translate-x-1/2">
                <div className="absolute left-1/2 top-1/2 h-28 w-60 -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-accent-bg/5 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                {cliWorkflowConnectors.map(({ key, className }) => (
                    <CliWorkflowConnector
                        key={key}
                        className={`absolute h-11 w-[58px] overflow-visible text-accent ${className}`}
                    />
                ))}

                {cliWorkflowSteps.map(({ command, icon: StepIcon, className }) => (
                    <div
                        key={command}
                        className={`homepage-visual-node absolute z-20 flex w-20 items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 py-2 ${className}`}
                    >
                        <StepIcon
                            className="size-3.5 shrink-0 text-accent transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
                            strokeWidth={1.8}
                        />
                        <div className="min-w-0">
                            <div className="font-mono text-[10px] leading-3 text-primary">{command}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Renders the dedicated visual for the LongLink work network card. */
function WorkNetworkVisual() {
    return (
        <div aria-hidden="true" className="relative h-40 overflow-hidden">
            <WorkNetworkConnections className="absolute inset-0 h-full w-full text-accent" />

            <div className="homepage-visual-node absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card/95 px-5 py-3">
                <Wordmark className="[&>span:first-child]:text-accent [&>span:last-child]:text-primary" />
            </div>

            {workNetworkNodes.map(({ label, icon: NodeIcon, className }) => (
                <div
                    key={label}
                    className={`homepage-visual-node absolute z-20 flex min-w-[84px] items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 py-1.5 ${className}`}
                >
                    <NodeIcon
                        className="size-3.5 shrink-0 text-accent transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
                        strokeWidth={1.8}
                    />
                    <span className="text-[10px] font-medium leading-3 text-primary">{label}</span>
                </div>
            ))}
        </div>
    );
}

/** Renders the dedicated visual for the Python ecosystem landing card. */
function PythonCardVisual() {
    return (
        <div aria-hidden="true" className="relative h-40 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-muted" />
            <div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-muted" />
            <div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-muted" />
            <div className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 bg-border" />
            <div className="absolute left-1/2 top-1/2 h-40 w-px -translate-y-1/2 bg-border" />
            <div className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 rotate-45 bg-border" />
            <div className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 -rotate-45 bg-border" />

            <div className="homepage-visual-node absolute left-1/2 top-1/2 z-20 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-accent">
                <Python className="size-6 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none" />
            </div>

            {pythonOrbitLibraries.map(({ key, icon: LibraryIcon, className }) => (
                <div
                    key={key}
                    className={`homepage-visual-node absolute z-20 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-accent ${className}`}
                >
                    <LibraryIcon
                        className="size-4 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none"
                        strokeWidth={1.8}
                    />
                </div>
            ))}
        </div>
    );
}

/** Renders the integration-scale callout and counts up when it enters the viewport. */
function IntegrationScale() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        // Observe the number so the count remains at zero until users can see it.
        const target = document.getElementById('integration-context-count');
        if (!target) return;

        // Show the final value without movement when reduced motion is requested.
        let frame = 0;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            frame = requestAnimationFrame(() => setCount(integrationContextCount));
            return () => cancelAnimationFrame(frame);
        }

        // Count up once using the design system's slow motion duration.
        const duration =
            Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-slow-max')) * 2;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;

                observer.disconnect();
                const startedAt = performance.now();

                const animate = (time: number) => {
                    const progress = Math.min((time - startedAt) / duration, 1);
                    const easedProgress = 1 - Math.pow(1 - progress, 3);

                    setCount(Math.round(integrationContextCount * easedProgress));
                    if (progress < 1) frame = requestAnimationFrame(animate);
                };

                frame = requestAnimationFrame(animate);
            },
            { threshold: 0.4 }
        );

        observer.observe(target);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <Section className="relative z-10 bg-transparent" variant="transparent" padding={6} paddingBlock={10}>
            <Stack
                className="relative mx-auto pb-10 pt-14 text-center sm:pb-16 sm:pt-20"
                width="100%"
                maxWidth={1000}
                gap={6}
                hAlign="center"
            >
                <Text className="text-xs font-medium uppercase tracking-widest" color="secondary">
                    The integration surface
                </Text>
                <Stack gap={3} hAlign="center">
                    <Heading
                        id="integration-context-count"
                        level={2}
                        type="display-1"
                        color="accent"
                        textWrap="nowrap"
                        justify="center"
                        className="text-4xl tracking-tight sm:text-5xl lg:text-6xl"
                    >
                        {count.toLocaleString('en-US').replaceAll(',', "'")}+
                    </Heading>
                    <Text as="p" className="text-lg tracking-tight sm:text-2xl" weight="medium">
                        Unique Industry & Geography Contexts.
                    </Text>
                </Stack>
                <Text as="p" className="max-w-2xl" color="secondary" textWrap="pretty">
                    Every industry and geography brings its own regulations, systems, data models, and workflows.
                    <br />
                    Each combination creates a distinct integration context that rigid, one-size-fits-all software
                    cannot cover.
                </Text>
            </Stack>
        </Section>
    );
}

/** Renders the public home page. */
export default function Home() {
    return (
        <div className="min-h-screen overflow-hidden">
            <Navbar />
            <main className="relative -mt-[84px] flex min-h-screen w-full items-center justify-center px-6 pb-10 pt-28">
                <div aria-hidden="true" className="homepage-hero-horizon absolute inset-0 overflow-visible">
                    <HeroGlobe />
                </div>
                <section className="relative z-10 mx-auto flex w-full max-w-5xl -translate-y-16 flex-col items-center text-center sm:-translate-y-24">
                    <div className="space-y-5">
                        <h1 className="mx-auto flex max-w-4xl flex-col items-center text-center text-[1.875rem] leading-[1.02] font-medium text-primary min-[420px]:text-[2.25rem] sm:text-6xl lg:text-7xl">
                            <span className="block whitespace-nowrap text-center">Just another dashboard</span>
                            <span className="mt-1 block whitespace-nowrap text-center line-through">
                                Nothing to see here
                            </span>
                        </h1>
                        <p className="mx-auto text-sm leading-6 text-secondary sm:text-lg">
                            <span className="mx-auto block">
                                The narrative has changed, but you are still buying the old story
                            </span>
                            <span className="mx-auto block tracking-[-0.012em]">
                                The economics have shifted; flexibility now lives in code
                            </span>
                            <span className="mx-auto block tracking-[0.018em]">
                                Build the process, not the workaround
                            </span>
                            <span className="mx-auto block tracking-[0.026em]">Start from solid foundations</span>
                            <span className="mx-auto block">This is LongLink</span>
                        </p>
                    </div>
                </section>
            </main>
            <IntegrationScale />
            <section className="relative z-20 bg-body px-6 py-10">
                <div aria-hidden="true" className="homepage-feature-transition" />
                <div className="relative z-10 mx-auto grid w-full max-w-[1000px] auto-rows-[minmax(190px,auto)] grid-cols-1 gap-3 md:grid-cols-6">
                    {homepageCards.map(({ title, description, details, layoutClassName, variant }) => {
                        const isXmlCard = variant === 'xml';
                        const isCliCard = variant === 'cli';
                        const isWorkCard = variant === 'work';
                        const isPythonCard = variant === 'python';
                        const isFoundationCard = variant === 'foundation';

                        return (
                            <article
                                key={title}
                                className={`homepage-feature-card group relative overflow-hidden rounded-lg border border-border bg-card p-5 text-primary ${layoutClassName}`}
                            >
                                <div className="relative flex h-full flex-col justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h2 className="text-lg font-medium text-primary">{title}</h2>
                                            <p className="max-w-md text-sm leading-6 text-secondary">{description}</p>
                                            {details.length ? <p className="sr-only">{details.join(', ')}</p> : null}
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
            <section className="homepage-painting-section relative z-20 overflow-hidden px-6 py-24 sm:py-32">
                <div className="mx-auto w-full max-w-[1000px]">
                    <div className="homepage-hands-hanging-frame">
                        <div aria-hidden="true" className="homepage-hands-nail" />
                        <div aria-hidden="true" className="homepage-hands-support homepage-hands-support-left" />
                        <div aria-hidden="true" className="homepage-hands-support homepage-hands-support-right" />

                        <div className="homepage-hands-frame">
                            <div className="homepage-hands-mat">
                                <img
                                    alt="Human and robot hands reaching toward each other"
                                    className="homepage-hands-image h-auto w-full object-contain"
                                    decoding="async"
                                    loading="lazy"
                                    src={humanRobotHandsImage}
                                />
                            </div>
                        </div>
                        <div className="homepage-hands-description">
                            <p className="homepage-hands-description-title">Designed for Human and Agents</p>
                            <p className="homepage-hands-description-copy">
                                LongLink gives agents the same governed application layer people use: structured
                                workflows, permissions, data, and APIs they can act on without brittle dashboard
                                automation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <Section
                className="homepage-path-section relative z-20"
                variant="transparent"
                padding={6}
                paddingBlock={10}
            >
                <Stack className="mx-auto" width="100%" maxWidth={1000} gap={8}>
                    <Grid columns={{ minWidth: 260, max: 3, repeat: 'fit' }} gap={0} width="100%">
                        {paths.map(({ title, description, action, href }) => (
                            <ClickableCard
                                key={title}
                                className="group min-h-80 rounded-none bg-transparent sm:min-h-96"
                                href={href}
                                label={action}
                                padding={6}
                            >
                                <Stack
                                    aria-hidden="true"
                                    className="absolute inset-0 origin-left scale-x-0 bg-muted transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100 motion-reduce:transition-none"
                                />
                                <Stack className="relative z-10" height="100%" gap={8} justify="between">
                                    <Stack gap={4}>
                                        <Heading
                                            level={2}
                                            type="display-1"
                                            textWrap="nowrap"
                                            className="text-6xl tracking-tighter sm:text-7xl"
                                        >
                                            {title}
                                        </Heading>
                                        <Text as="p" color="secondary" textWrap="pretty">
                                            {description}
                                        </Text>
                                    </Stack>
                                    <Stack
                                        direction="horizontal"
                                        hAlign="between"
                                        vAlign="center"
                                        width="100%"
                                        className="whitespace-nowrap"
                                    >
                                        <Text weight="medium">{action}</Text>
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="size-4 transition-transform group-hover:translate-x-1 group-focus-within:translate-x-1 motion-reduce:transition-none"
                                        />
                                    </Stack>
                                </Stack>
                                <Stack
                                    aria-hidden="true"
                                    className="path-navigation-cue absolute inset-x-0 bottom-0 z-10 h-1 origin-left scale-x-0 bg-accent-bg opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                                />
                            </ClickableCard>
                        ))}
                    </Grid>
                </Stack>
            </Section>
            <section className="relative z-10 bg-body px-6 py-24 text-center sm:py-28">
                <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">
                    <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-secondary">Next step</p>
                        <h2 className="text-2xl font-medium tracking-tight text-primary sm:text-4xl">
                            Start building on LongLink
                        </h2>
                        <p className="text-sm leading-6 text-secondary sm:text-base">
                            Explore LongLink, build an app, or talk to us.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <Button
                            href="/docs/sdk"
                            label="Read the SDK guide"
                            size="lg"
                            variant="primary"
                            endContent={<ArrowRight className="size-4" aria-hidden="true" />}
                        />
                        <Button
                            href="mailto:info@longlink.dev"
                            label="Contact us"
                            size="lg"
                            variant="secondary"
                            icon={<Mail className="size-4" aria-hidden="true" />}
                        />
                    </div>
                </div>
            </section>
            <div className="relative z-10 bg-body">
                <Footer />
            </div>
        </div>
    );
}
