import { Seo } from '@/components/Seo';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { useEffect, useEffectEvent } from 'react';
import { HowSlide } from '@/components/slides/How';
import Platform from '@/platform/layouts/Platform';
import { GoalSlide } from '@/components/slides/Goal';
import { TeamSlide } from '@/components/slides/Team';
import { PathsSlide } from '@/components/slides/Paths';
import { useLocation, useNavigate } from 'react-router';
import { ProblemSlide } from '@/components/slides/Problem';
import { IntroductionSlide } from '@/components/slides/Introduction';
import { BookOpen, GitFork, Target, TriangleAlert, Users, Wrench } from 'lucide-react';

const slides = [
    { component: PathsSlide, href: '/ppt?slide=paths', icon: GitFork, id: 'paths', label: 'Paths' },
    {
        component: IntroductionSlide,
        href: '/ppt?slide=introduction',
        icon: BookOpen,
        id: 'introduction',
        label: 'Introduction',
    },
    { component: ProblemSlide, href: '/ppt?slide=problem', icon: TriangleAlert, id: 'problem', label: 'Problem' },
    { component: GoalSlide, href: '/ppt?slide=goal', icon: Target, id: 'goal', label: 'Goal' },
    { component: HowSlide, href: '/ppt?slide=how', icon: Wrench, id: 'how', label: 'How' },
    { component: TeamSlide, href: '/ppt?slide=team', icon: Users, id: 'team', label: 'Team' },
] as const;

const printStyles = `
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
        margin: 0.25in;
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
            --ppt-print-slide-height: 7in;
            --ppt-print-slide-width: 12.833in;
        }

        .ppt-print-slide,
        .ppt-print-title-slide {
            width: var(--ppt-print-slide-width);
            height: var(--ppt-print-slide-height);
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
            <Slide />
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
                    <Wordmark size="heading" />
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
                    <Text hasCapsize type="display-3" weight="semibold">
                        longlink.dev
                    </Text>
                </Stack>
            </Stack>
        </>
    );
}
