import { useEffect, useRef } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { industryGroups, sharedUseCaseGroups } from '@/lib/industries';

const industries = industryGroups.flatMap((group) => group.industries);

const industryNames = [...new Set(industries.flatMap((industry) => industry.name.split(' & ')))];

const useCases = [
    ...industries.flatMap((industry) => industry.useCases),
    ...sharedUseCaseGroups.flatMap((group) => group.useCases),
];

const copies = [0, 1, 2];

/** Repeats a text row for seamless movement without repeating accessible content. */
function MovingRow({ items, label, reverse = false }: { items: readonly string[]; label: string; reverse?: boolean }) {
    const trackRef = useRef<HTMLDivElement>(null);

    // Keep the drift slow regardless of the number or length of labels.
    useEffect(() => {
        const track = trackRef.current;

        if (!track) return;

        const updateDuration = () => {
            track.style.setProperty('--foundation-drift-duration', `${track.scrollWidth / copies.length / 18}s`);
        };

        updateDuration();
        const observer = new ResizeObserver(updateDuration);
        observer.observe(track);

        return () => observer.disconnect();
    }, []);

    return (
        <Stack className="overflow-hidden mask-x-from-80% mask-x-to-100% motion-reduce:overflow-x-auto">
            <Stack className={reverse ? 'foundation-scroll-reverse' : 'foundation-scroll'}>
                <Stack
                    ref={trackRef}
                    className={reverse ? 'foundation-track foundation-track-reverse' : 'foundation-track'}
                    direction="horizontal"
                >
                    {copies.map((copy) => (
                        <Stack
                            key={copy}
                            as="ul"
                            aria-label={copy === 0 ? label : undefined}
                            aria-hidden={copy !== 0 || undefined}
                            className={`min-w-screen shrink-0 ${copy !== 0 ? 'motion-reduce:hidden' : ''}`}
                            direction="horizontal"
                            gap={10}
                            paddingInline={5}
                            vAlign="center"
                            hAlign="around"
                        >
                            {items.map((item) => (
                                <li key={item} className="shrink-0 text-xl whitespace-nowrap text-white/60 sm:text-3xl">
                                    {item}
                                </li>
                            ))}
                        </Stack>
                    ))}
                </Stack>
            </Stack>
        </Stack>
    );
}

/** Connects industries and use cases around one extensible Platform foundation. */
export function Foundation() {
    const sectionRef = useRef<HTMLDivElement>(null);

    // Add scroll movement only while the section is visible and motion is enabled.
    useEffect(() => {
        const section = sectionRef.current;

        if (!section) return;

        let visible = false;
        let frame = 0;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        const update = () => {
            frame = 0;

            if (!visible) return;

            const bounds = section.getBoundingClientRect();

            const progress = Math.min(
                1,
                Math.max(0, (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height))
            );

            const offset = reducedMotion.matches ? 0 : (0.5 - progress) * window.innerWidth * 0.35;
            section.style.setProperty('--foundation-scroll', `${offset}px`);
        };

        const schedule = () => {
            if (visible && !frame) frame = window.requestAnimationFrame(update);
        };

        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            section.dataset.paused = String(!visible);
            schedule();
        });

        observer.observe(section);
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        reducedMotion.addEventListener('change', schedule);

        return () => {
            observer.disconnect();
            window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            reducedMotion.removeEventListener('change', schedule);
        };
    }, []);

    return (
        <Section
            ref={sectionRef}
            aria-labelledby="foundation-heading"
            aria-describedby="foundation-motion-description"
            className="overflow-hidden py-20 sm:py-32"
            data-paused="true"
            tabIndex={0}
            padding={0}
            variant="transparent"
        >
            <Stack gap={10}>
                <Text id="foundation-motion-description" className="sr-only">
                    Automatic motion pauses while this section has keyboard focus.
                </Text>
                <MovingRow items={industryNames} label="Industries" />
                <Stack
                    className="mx-auto text-center"
                    gap={5}
                    hAlign="center"
                    maxWidth={1000}
                    paddingInline={6}
                    paddingBlock={10}
                >
                    <Heading
                        id="foundation-heading"
                        className="text-3xl tracking-tight sm:text-5xl"
                        level={2}
                        justify="center"
                        textWrap="balance"
                    >
                        One foundation.
                        <br />
                        Every way you work.
                    </Heading>
                    <Text as="p" className="max-w-xl" color="secondary" textWrap="pretty" type="large">
                        Start with one process. Build the next. LongLink gives your team a foundation for dedicated
                        business software, across industries and wherever your work takes you.
                    </Text>
                </Stack>
                <MovingRow items={useCases} label="Use cases" reverse />
            </Stack>
        </Section>
    );
}
