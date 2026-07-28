import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { ArrowRight } from 'lucide-react';
import { type PointerEvent, useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { HeroGlobe } from '@/platform/HeroGlobe';

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
    const [paintingHasEntered, setPaintingHasEntered] = useState(false);

    useEffect(() => {
        const target = document.getElementById('homepage-hands-scroll-swing');
        if (!target) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;

                setPaintingHasEntered(true);
                observer.disconnect();
            },
            { threshold: 0.35 }
        );

        observer.observe(target);

        return () => observer.disconnect();
    }, []);

    function handlePaintingPointerMove(event: PointerEvent<HTMLDivElement>) {
        const bounds = event.currentTarget.getBoundingClientRect();
        const horizontalPosition = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;

        event.currentTarget.style.setProperty('--painting-swing', `${horizontalPosition * 2.8}deg`);
    }

    function handlePaintingPointerLeave(event: PointerEvent<HTMLDivElement>) {
        event.currentTarget.style.setProperty('--painting-swing', '0deg');
    }

    return (
        <div className="min-h-screen overflow-x-clip">
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
            <section aria-labelledby="before-after-heading" className="relative z-20">
                <Heading id="before-after-heading" level={2} className="sr-only">
                    Before and after LongLink
                </Heading>
                <Stack
                    as="figure"
                    className="homepage-before-after-scene sticky top-0 isolate overflow-hidden"
                    width="100%"
                    minHeight="100svh"
                    justify="center"
                    hAlign="center"
                >
                    <Stack
                        aria-label="A fragmented city of unfinished buildings, tangled infrastructure, and disconnected old solutions"
                        role="img"
                        className="homepage-before-after-art homepage-before-after-art-before absolute inset-0"
                    />
                    <Stack
                        as="figcaption"
                        className="absolute inset-x-0 top-0 z-10 mx-auto"
                        width="100%"
                        maxWidth={1280}
                        gap={2}
                        padding={6}
                    >
                        <Text className="text-xs uppercase tracking-widest" color="secondary" weight="medium">
                            Before LongLink
                        </Text>
                        <Heading level={3} type="display-2" textWrap="balance">
                            Old solutions
                        </Heading>
                    </Stack>
                </Stack>
                <Stack
                    as="figure"
                    className="homepage-before-after-scene relative z-10 isolate overflow-hidden"
                    width="100%"
                    minHeight="100svh"
                    justify="center"
                    hAlign="center"
                >
                    <Stack
                        aria-label="A complete, coherent city representing the unified LongLink solution"
                        role="img"
                        className="homepage-before-after-art homepage-before-after-art-after absolute inset-0"
                    />
                    <Stack
                        as="figcaption"
                        className="absolute inset-x-0 top-0 z-10 mx-auto"
                        width="100%"
                        maxWidth={1280}
                        gap={2}
                        padding={6}
                    >
                        <Text className="text-xs uppercase tracking-widest" color="secondary" weight="medium">
                            After
                        </Text>
                        <Heading level={3} type="display-2" textWrap="balance">
                            The LongLink solution
                        </Heading>
                    </Stack>
                </Stack>
            </section>
            <section className="homepage-painting-section relative z-20 overflow-hidden px-6 py-24 sm:py-32">
                <div className="mx-auto w-full max-w-[1000px]">
                    <div className="homepage-hands-hanging-frame">
                        <div aria-hidden="true" className="homepage-hands-nail" />
                        <div
                            id="homepage-hands-scroll-swing"
                            className={`homepage-hands-scroll-swing ${
                                paintingHasEntered ? 'homepage-hands-scroll-swing-active' : ''
                            }`}
                        >
                            <div
                                className="homepage-hands-swing"
                                onPointerLeave={handlePaintingPointerLeave}
                                onPointerMove={handlePaintingPointerMove}
                            >
                                <div
                                    aria-hidden="true"
                                    className="homepage-hands-support homepage-hands-support-left"
                                />
                                <div
                                    aria-hidden="true"
                                    className="homepage-hands-support homepage-hands-support-right"
                                />

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
                            </div>
                        </div>
                        <div className="homepage-hands-description">
                            <p className="homepage-hands-description-title">Designed for Human and Agents</p>
                            <p className="homepage-hands-description-copy">Coming Soon</p>
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
                    <Text className="text-xs font-medium uppercase tracking-widest" color="secondary">
                        Next step
                    </Text>
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
            <div className="homepage-tertiary-section relative z-10">
                <Footer />
            </div>
        </div>
    );
}
