import { useEffect, useRef } from 'react';
import { industryGroups, sharedUseCaseGroups } from '@/lib/industries';

const industries = industryGroups.flatMap((group) => group.industries);

const industryNames = [...new Set(industries.flatMap((industry) => industry.name.split(' & ')))];

const useCases = [
    ...industries.flatMap((industry) => industry.useCases),
    ...sharedUseCaseGroups.flatMap((group) => group.useCases)
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
        <div className="flex flex-col overflow-hidden mask-x-from-80% mask-x-to-100% motion-reduce:overflow-x-auto">
            <div className={reverse ? 'foundation-scroll-reverse' : 'foundation-scroll'}>
                <div
                    ref={trackRef}
                    className={`flex ${reverse ? 'foundation-track foundation-track-reverse' : 'foundation-track'}`}
                >
                    {copies.map((copy) => (
                        <ul
                            key={copy}
                            aria-label={copy === 0 ? label : undefined}
                            aria-hidden={copy !== 0 || undefined}
                            className={`flex min-w-screen shrink-0 items-center justify-around gap-10 px-5 ${copy !== 0 ? 'motion-reduce:hidden' : ''}`}
                        >
                            {items.map((item) => (
                                <li key={item} className="shrink-0 text-xl whitespace-nowrap text-white/60 sm:text-3xl">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Connects industries and use cases around one extensible Platform foundation. */
export function Foundation() {
    const sectionRef = useRef<HTMLElement>(null);

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
            // oxlint-disable-next-line react/immutability -- Effect-local cleanup; oxc-project/oxc#28401.
            if (visible && !frame) frame = window.requestAnimationFrame(update);
        };

        const observer = new IntersectionObserver(([entry]) => {
            // oxlint-disable-next-line react/immutability -- Effect-local visibility; oxc-project/oxc#28401.
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
        <section
            ref={sectionRef}
            aria-labelledby="foundation-heading"
            aria-describedby="foundation-motion-description"
            className="foundation overflow-hidden py-20 font-sans sm:py-32"
            data-paused="true"
            tabIndex={0}
        >
            <div className="flex flex-col gap-10">
                <p id="foundation-motion-description" className="sr-only">
                    Automatic motion pauses while this section has keyboard focus.
                </p>
                <MovingRow items={industryNames} label="Industries" />
                <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-5 px-6 py-10 text-center">
                    <h2
                        id="foundation-heading"
                        className="text-center font-sans text-3xl leading-(--text-3xl--line-height) font-semibold tracking-tight text-balance text-foreground sm:text-5xl"
                    >
                        One foundation.
                        <br />
                        Every way you work.
                    </h2>
                    <p className="max-w-xl text-lg leading-(--text-lg--line-height) font-semibold text-pretty text-muted-foreground">
                        Start with one process. Build the next. LongLink gives your team a foundation for dedicated
                        business software, across industries and wherever your work takes you.
                    </p>
                </div>
                <MovingRow items={useCases} label="Use cases" reverse />
            </div>
        </section>
    );
}
