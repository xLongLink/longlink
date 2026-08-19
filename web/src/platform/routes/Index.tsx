import { ArrowRight } from 'lucide-react';
import { Globe } from '@/components/Globe';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { useEffect, useRef, useState } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import humanRobotHands from '@/components/svg/HumanRobotHands.svg';

const paths = [
    {
        title: 'Use',
        description:
            'Deploy an existing application as it is. Get a proven process running without rebuilding what already exists.',
        action: 'Explore existing apps',
        href: '/marketplace',
        isComingSoon: true,
    },
    {
        title: 'Adapt',
        description:
            'Fork an existing application and change its workflow, fields, rules, integrations, or interface around your requirements.',
        action: 'Start from a foundation',
        href: '/docs',
        isComingSoon: true,
    },
    {
        title: 'Create',
        description:
            'Build a dedicated application when the process is uniquely yours. LongLink handles the platform; you own the application.',
        action: 'Build a new app',
        href: '/docs',
        isComingSoon: false,
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
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setCount(integrationContextCount);
            return;
        }

        // Count up once using the design system's slow motion duration.
        let frame: number | undefined;
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
            if (frame !== undefined) {
                cancelAnimationFrame(frame);
            }
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
                        Unique Industry x Geography Contexts.
                    </Text>
                </Stack>
                <Text as="p" className="max-w-2xl" color="secondary" textWrap="pretty">
                    Each market has different regulations, data, and workflows.
                    <br />
                    Each requires a specific solution.
                </Text>
            </Stack>
        </Section>
    );
}

/** Renders the public home page. */
export default function Home() {
    const comparisonRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const target = comparisonRef.current;
        if (!target) return;

        let frame: number | undefined;

        // Hold before and after the city reveal for 60vh, then reveal the buildings across 80vh.
        const updatePosition = () => {
            frame = undefined;
            const scrollDistance = target.offsetHeight - window.innerHeight;
            const scrollProgress =
                scrollDistance > 0 ? Math.min(Math.max(-target.getBoundingClientRect().top / scrollDistance, 0), 1) : 0;
            const revealProgress = Math.min(Math.max((scrollProgress - 0.3) / 0.4, 0), 1);

            target.style.setProperty('--homepage-before-after-position', `${revealProgress * 100}%`);
        };

        // Limit image updates to one animation frame while the page is scrolling.
        const queuePositionUpdate = () => {
            if (frame !== undefined) return;

            frame = requestAnimationFrame(updatePosition);
        };

        updatePosition();
        window.addEventListener('resize', queuePositionUpdate);
        window.addEventListener('scroll', queuePositionUpdate, { passive: true });

        return () => {
            if (frame !== undefined) cancelAnimationFrame(frame);

            window.removeEventListener('resize', queuePositionUpdate);
            window.removeEventListener('scroll', queuePositionUpdate);
        };
    }, []);

    return (
        <>
            <main className="relative -mt-21 flex min-h-screen w-full overflow-x-clip items-center justify-center px-6 pb-10 pt-28">
                <div aria-hidden="true" className="absolute inset-0 overflow-visible bg-body">
                    <Globe />
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
            <section
                ref={comparisonRef}
                aria-labelledby="before-after-heading"
                className="homepage-before-after-section relative z-20"
            >
                <Heading id="before-after-heading" level={2} className="sr-only">
                    Build. Follow development standards. Operate. Keep workflows and costs under control.
                </Heading>
                <Stack
                    as="figure"
                    className="sticky top-0 isolate overflow-hidden bg-body"
                    width="100%"
                    minHeight="100svh"
                    justify="center"
                    hAlign="center"
                >
                    <img
                        alt="LongLink infrastructure before buildings are added"
                        className="pointer-events-none absolute inset-0 size-full object-cover object-center"
                        src="/images/before-longlink.png"
                    />
                    <img
                        alt="LongLink infrastructure after buildings are added"
                        className="homepage-before-after-reveal pointer-events-none absolute inset-0 size-full object-cover object-center"
                        src="/images/after-longlink.png"
                    />
                    <Stack
                        aria-hidden="true"
                        className="homepage-before-after-copy pointer-events-none absolute inset-0 z-1"
                        hAlign="center"
                        vAlign="center"
                    >
                        <Stack className="-translate-y-28 sm:-translate-y-32" width="100%" hAlign="center">
                            <Stack
                                className="relative h-24 sm:h-28 lg:h-32"
                                width="100%"
                                hAlign="center"
                                vAlign="center"
                            >
                                <Stack
                                    className="homepage-before-after-copy-before absolute inset-0"
                                    gap={2}
                                    hAlign="center"
                                    vAlign="center"
                                >
                                    <Heading
                                        className="text-6xl tracking-tighter sm:text-7xl"
                                        level={2}
                                        textWrap="nowrap"
                                        type="display-1"
                                    >
                                        Build
                                    </Heading>
                                    <Text
                                        className="max-w-2xl px-6 text-center font-medium uppercase tracking-widest"
                                        color="secondary"
                                        display="block"
                                        textWrap="pretty"
                                    >
                                        Follow development standards.
                                    </Text>
                                </Stack>
                                <Stack
                                    className="homepage-before-after-copy-after absolute inset-0"
                                    gap={2}
                                    hAlign="center"
                                    vAlign="center"
                                >
                                    <Heading
                                        className="text-6xl tracking-tighter sm:text-7xl"
                                        level={2}
                                        textWrap="nowrap"
                                        type="display-1"
                                    >
                                        Operate
                                    </Heading>
                                    <Text
                                        className="max-w-2xl px-6 text-center font-medium uppercase tracking-widest"
                                        color="secondary"
                                        display="block"
                                        textWrap="pretty"
                                    >
                                        Keep workflows and costs under control.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Stack>
                    </Stack>
                </Stack>
            </section>
            <section className="relative z-20 overflow-hidden px-6 py-24 sm:py-32">
                <Stack className="mx-auto" width="100%" maxWidth={1000}>
                    <div className="relative z-2">
                        <div
                            aria-hidden="true"
                            className="homepage-hands-nail absolute top-0 left-1/2 z-4 -translate-x-1/2 rounded-full"
                        />
                        <div className="homepage-hands relative">
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
                                        src={humanRobotHands}
                                    />
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
                                Designed for the Agentic Era
                            </Text>
                            <Text
                                as="p"
                                className="homepage-hands-description-copy relative z-1"
                                display="block"
                                textWrap="pretty"
                                type="supporting"
                            >
                                Humans make the decisions. Agents execute the work.
                            </Text>
                            <Stack className="relative z-1 mt-3" hAlign="end">
                                <Text type="supporting">Coming Soon</Text>
                            </Stack>
                        </div>
                    </div>
                </Stack>
            </section>
            <Section className="relative z-20 -mt-px" variant="transparent" padding={6} paddingBlock={10}>
                <Stack className="mx-auto" width="100%" maxWidth={1000} gap={8}>
                    <Grid columns={{ minWidth: 260, max: 3, repeat: 'fit' }} width="100%">
                        {paths.map(({ title, description, action, href, isComingSoon }) => (
                            <Stack key={title} width="100%">
                                <Stack aria-hidden={!isComingSoon} className={isComingSoon ? undefined : 'invisible'}>
                                    <Banner
                                        container="section"
                                        status="warning"
                                        title={<Text type="supporting">Coming Soon</Text>}
                                    />
                                </Stack>
                                <ClickableCard
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
                            </Stack>
                        ))}
                    </Grid>
                </Stack>
            </Section>
        </>
    );
}
