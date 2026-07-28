import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { ReactCompareSlider } from 'react-compare-slider';
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

/** Renders the integration-scale callout and counts up when it enters the viewport. */
function IntegrationScale() {
    const [count, setCount] = useState(0);
    const countRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        // Observe the number so the count remains at zero until users can see it.
        const target = countRef.current;
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
        <Section
            className="homepage-integration-section relative z-10"
            variant="transparent"
            padding={6}
            paddingBlock={10}
        >
            <Stack
                className="relative z-10 mx-auto pb-10 pt-14 text-center sm:pb-16 sm:pt-20"
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
                        ref={countRef}
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
    const paintingRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const target = paintingRef.current;
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
            <main className="relative -mt-21 flex min-h-screen w-full items-center justify-center px-6 pb-10 pt-28">
                <div aria-hidden="true" className="absolute inset-0 overflow-visible bg-body">
                    <HeroGlobe />
                </div>
                <section className="relative z-10 mx-auto flex w-full max-w-5xl -translate-y-16 flex-col items-center text-center sm:-translate-y-24">
                    <Stack gap={5}>
                        <Heading
                            className="mx-auto max-w-4xl text-[1.875rem] leading-[1.02] font-medium min-[420px]:text-[2.25rem] sm:text-6xl lg:text-7xl"
                            justify="center"
                            level={1}
                        >
                            <Text display="block" textWrap="nowrap" type="inherit">
                                Just another dashboard
                            </Text>
                            <Text className="mt-1" display="block" hasStrikethrough textWrap="nowrap" type="inherit">
                                Nothing to see here
                            </Text>
                        </Heading>
                        <Text as="p" className="mx-auto text-sm leading-6 sm:text-lg" color="secondary" display="block">
                            <Text display="block" type="inherit">
                                The narrative has changed, but you are still buying the old story
                            </Text>
                            <Text className="tracking-[-0.012em]" display="block" type="inherit">
                                The economics have shifted; flexibility now lives in code
                            </Text>
                            <Text className="tracking-[0.018em]" display="block" type="inherit">
                                Build the process, not the workaround
                            </Text>
                            <Text className="tracking-[0.026em]" display="block" type="inherit">
                                Start from solid foundations
                            </Text>
                            <Text display="block" type="inherit">
                                This is LongLink
                            </Text>
                        </Text>
                    </Stack>
                </section>
            </main>
            <IntegrationScale />
            <section aria-labelledby="before-after-heading" className="relative z-20">
                <Heading id="before-after-heading" level={2} className="sr-only">
                    Before and after LongLink
                </Heading>
                <Stack
                    as="figure"
                    className="relative isolate overflow-hidden bg-body"
                    width="100%"
                    minHeight="100svh"
                    justify="center"
                    hAlign="center"
                >
                    <Stack className="absolute inset-0">
                        <ReactCompareSlider
                            className="homepage-before-after-slider size-full"
                            defaultPosition={50}
                            handle={
                                <Stack aria-hidden="true" className="pointer-events-none h-full" hAlign="center">
                                    <Stack className="pointer-events-auto w-0.5 grow cursor-ew-resize bg-accent-bg" />
                                    <Stack
                                        className="homepage-before-after-handle-button pointer-events-auto size-14 shrink-0 cursor-ew-resize rounded-full border-2 border-accent-bg bg-body/80 backdrop-blur-sm"
                                        direction="horizontal"
                                        gap={1}
                                        hAlign="center"
                                        vAlign="center"
                                    >
                                        <ChevronLeft aria-hidden="true" className="size-4 text-accent" />
                                        <ChevronRight aria-hidden="true" className="size-4 text-accent" />
                                    </Stack>
                                    <Stack className="pointer-events-auto w-0.5 grow cursor-ew-resize bg-accent-bg" />
                                </Stack>
                            }
                            itemOne={
                                <Stack
                                    aria-label="Fragmented city illustration"
                                    role="img"
                                    className="homepage-before-after-art homepage-before-after-art-before size-full bg-secondary"
                                />
                            }
                            itemTwo={
                                <Stack
                                    aria-label="Unified city illustration"
                                    role="img"
                                    className="homepage-before-after-art homepage-before-after-art-after size-full bg-secondary"
                                />
                            }
                            keyboardIncrement="2%"
                            onlyHandleDraggable={false}
                        />
                    </Stack>
                </Stack>
            </section>
            <section className="homepage-painting-section relative z-20 overflow-hidden px-6 py-24 sm:py-32">
                <Stack className="mx-auto" width="100%" maxWidth={1000}>
                    <div className="relative z-2">
                        <div
                            aria-hidden="true"
                            className="homepage-hands-nail absolute top-0 left-1/2 z-4 -translate-x-1/2 rounded-full"
                        />
                        <div
                            ref={paintingRef}
                            className={`homepage-hands-scroll-swing relative ${
                                paintingHasEntered ? 'homepage-hands-scroll-swing-active' : ''
                            }`}
                        >
                            <div
                                className="homepage-hands-swing relative"
                                onPointerLeave={handlePaintingPointerLeave}
                                onPointerMove={handlePaintingPointerMove}
                            >
                                <div
                                    aria-hidden="true"
                                    className="homepage-hands-support homepage-hands-support-left absolute left-1/2 z-1 origin-left"
                                />
                                <div
                                    aria-hidden="true"
                                    className="homepage-hands-support homepage-hands-support-right absolute left-1/2 z-1 origin-left"
                                />

                                <div className="homepage-hands-frame relative z-2 p-0">
                                    <div className="homepage-hands-mat relative overflow-hidden border-0 bg-body">
                                        <img
                                            alt="Human and robot hands reaching toward each other"
                                            className="block h-auto w-full object-contain"
                                            decoding="async"
                                            loading="lazy"
                                            src="/human_robot_hands_vector.svg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="homepage-hands-description relative z-2">
                            <Text
                                as="p"
                                className="homepage-hands-description-title relative z-1 m-0 tracking-normal"
                                color="primary"
                                display="block"
                                textWrap="balance"
                                weight="semibold"
                            >
                                Designed for Human and Agents
                            </Text>
                            <Text
                                as="p"
                                className="homepage-hands-description-copy relative z-1"
                                display="block"
                                textWrap="pretty"
                                type="supporting"
                            >
                                Coming Soon
                            </Text>
                        </div>
                    </div>
                </Stack>
            </section>
            <Section
                className="homepage-path-section relative z-20 -mt-px"
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
