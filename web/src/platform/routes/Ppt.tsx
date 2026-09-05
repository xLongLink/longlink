import { Seo } from '@/components/Seo';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { useEffect, useEffectEvent } from 'react';
import Platform from '@/platform/layouts/Platform';
import { PlanSlide } from '@/components/slides/Plan';
import { TeamSlide } from '@/components/slides/Team';
import { useLocation, useNavigate } from 'react-router';
import { TargetSlide } from '@/components/slides/Target';
import { PlatformSlide } from '@/components/slides/Platform';
import { PrinciplesSlide } from '@/components/slides/Principles';
import { IntroductionSlide } from '@/components/slides/Introduction';
import { BookOpen, CalendarRange, ListChecks, Server, Target, Users } from 'lucide-react';

const slides = [
    {
        component: IntroductionSlide,
        href: '/ppt?slide=introduction',
        icon: BookOpen,
        id: 'introduction',
        label: 'Introduction',
    },
    {
        component: TargetSlide,
        href: '/ppt?slide=target',
        icon: Target,
        id: 'target',
        label: 'Target',
    },
    {
        component: PrinciplesSlide,
        href: '/ppt?slide=principles',
        icon: ListChecks,
        id: 'principles',
        label: 'Principles',
    },
    {
        component: PlatformSlide,
        href: '/ppt?slide=platform',
        icon: Server,
        id: 'platform',
        label: 'Platform',
    },
    {
        component: PlanSlide,
        href: '/ppt?slide=plan',
        icon: CalendarRange,
        id: 'plan',
        label: 'Plan',
    },
    { component: TeamSlide, href: '/ppt?slide=team', icon: Users, id: 'team', label: 'Team' },
] as const;

const printStyles = `
    .ppt-slide-content {
        --font-family-body: 'Caveat Variable', 'Segoe Print', 'Bradley Hand', cursive;
        --font-family-heading: 'Caveat Variable', 'Segoe Print', 'Bradley Hand', cursive;
    }

    .ppt-slide-standard-font {
        --font-family-body: Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        --font-family-heading: Montserrat, Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .ppt-brittle-brick {
        position: relative;
        isolation: isolate;
        border-radius: var(--radius-none);
        clip-path: polygon(
            0 0,
            38% 0,
            42% 7%,
            47% 0,
            100% 0,
            100% 57%,
            95% 64%,
            100% 73%,
            100% 100%,
            62% 100%,
            57% 93%,
            52% 100%,
            0 100%,
            0 64%,
            5% 57%,
            0 49%
        );
    }

    .ppt-screen-slide {
        width: 100%;
        height: 100dvh;
        align-items: center;
        justify-content: center;
    }

    .ppt-screen-frame {
        --ppt-screen-margin: var(--spacing-6);
        width: min(
            calc(100% - var(--ppt-screen-margin) * 2),
            calc((100dvh - var(--ppt-screen-margin) * 2) * 16 / 9)
        );
        aspect-ratio: 16 / 9;
        border-radius: var(--radius-none);
        overflow: hidden;
    }

    .ppt-screen-frame .astryx-app-shell,
    .ppt-screen-frame .astryx-layout {
        width: 100%;
        height: 100%;
        min-height: 0;
    }

    .ppt-print-slides {
        display: none;
    }

    @page {
        size: 13.333in 7.5in;
        margin: 0;
    }

    @media print {
        html,
        body,
        .ppt-print-slides {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
        }

        .ppt-screen-slide {
            display: none;
        }

        .ppt-print-slides {
            display: block;
        }

        .ppt-print-slide,
        .ppt-print-title-slide {
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            break-inside: avoid;
            break-after: page;
        }

        .ppt-print-slide .astryx-app-shell {
            height: 100%;
            min-height: 0;
        }

        .ppt-print-slide #astryx-app-shell-main > .astryx-stack {
            min-height: calc(100% - var(--_app-shell-header-height, 0px));
        }

        .ppt-print-slide:last-child {
            break-after: auto;
        }
    }
`;

/** Renders a single Platform presentation slide. */
function PresentationSlide({
    className,
    isScreen = false,
    slideIndex,
}: {
    className: string;
    isScreen?: boolean;
    slideIndex: number;
}) {
    const slide = slides[slideIndex];
    const Slide = slide.component;
    const platform = (
        <Platform
            action={
                <Text hasTabularNumbers type="supporting">
                    {slideIndex + 1} / {slides.length}
                </Text>
            }
            activeTab={slide.href}
            contentMinHeight="100%"
            height="fill"
            isContentCentered
            isDevelopmentNoticeShown={false}
            tabs={slides}
        >
            <Stack align="center" className="ppt-slide-content" height="100%" justify="center" width="100%">
                <Slide />
            </Stack>
        </Platform>
    );

    return (
        <Stack as="section" aria-label={`Slide ${slideIndex + 1} of ${slides.length}`} className={className}>
            {isScreen ? (
                <Card className="ppt-screen-frame" padding={0}>
                    {platform}
                </Card>
            ) : (
                platform
            )}
        </Stack>
    );
}

/** Renders the dashboard presentation. */
export default function Ppt() {
    const { search } = useLocation();
    const navigate = useNavigate();
    const slideId = new URLSearchParams(search).get('slide');
    const slideIndex = Math.max(
        0,
        slides.findIndex((slide) => slide.id === slideId)
    );
    const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
        // Keep presentation navigation from moving the document viewport.
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            navigate(slides[Math.max(0, slideIndex - 1)].href);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            navigate(slides[Math.min(slides.length - 1, slideIndex + 1)].href);
        }
    });

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <Seo isIndexable={false} />
            <style>{printStyles}</style>
            <PresentationSlide className="ppt-screen-slide" isScreen slideIndex={slideIndex} />
            <Stack className="ppt-print-slides" width="100%">
                <Stack
                    as="section"
                    aria-label="LongLink title slide"
                    className="ppt-print-title-slide"
                    justify="center"
                    align="center"
                >
                    <Wordmark size="display" />
                </Stack>
                {slides.map((slide, printSlideIndex) => (
                    <PresentationSlide className="ppt-print-slide" key={slide.id} slideIndex={printSlideIndex} />
                ))}
                <Stack
                    as="section"
                    aria-label="LongLink closing slide"
                    className="ppt-print-slide ppt-print-title-slide"
                    justify="center"
                    align="center"
                >
                    <Stack align="center" gap={4}>
                        <Wordmark size="display" />
                        <Text hasCapsize type="large" weight="semibold">
                            longlink.dev
                        </Text>
                    </Stack>
                </Stack>
            </Stack>
        </>
    );
}
