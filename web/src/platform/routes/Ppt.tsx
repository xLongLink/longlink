import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { useEffect, useEffectEvent } from 'react';
import Platform from '@/platform/layouts/Platform';
import { useLocation, useNavigate } from 'react-router';

const slides = [
    { href: '/ppt?slide=why', id: 'why', label: 'Why' },
    { href: '/ppt?slide=what', id: 'what', label: 'What' },
    { href: '/ppt?slide=when', id: 'when', label: 'When' },
    { href: '/ppt?slide=where', id: 'where', label: 'Where' },
    { href: '/ppt?slide=who', id: 'who', label: 'Who' },
    { href: '/ppt?slide=how', id: 'how', label: 'How' },
] as const;
const printStyles = `
    .ppt-screen-slide {
        display: flex;
        width: 100vw;
        height: 100dvh;
        align-items: center;
        justify-content: center;
    }

    .ppt-screen-slide > .astryx-app-shell {
        width: min(100vw, calc(100dvh * 16 / 9));
        height: min(100dvh, calc(100vw * 9 / 16));
        min-height: 0;
    }

    .ppt-screen-slide .astryx-layout {
        height: 100%;
    }

    .ppt-screen-slide #astryx-app-shell-main > .astryx-stack {
        min-height: calc(100% - var(--_app-shell-header-height, 0px));
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
            --ppt-print-slide-height: 7.375in;
            --ppt-print-slide-width: 13.111in;
        }

        .ppt-print-slide,
        .ppt-print-title-slide {
            width: var(--ppt-print-slide-width);
            height: var(--ppt-print-slide-height);
            margin: 0.0625in auto;
            box-sizing: border-box;
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

/** Renders a single empty Platform presentation slide. */
function PresentationSlide({ className, slideIndex }: { className?: string; slideIndex: number }) {
    const slide = slides[slideIndex];

    return (
        <Stack
            as="section"
            aria-label={`Slide ${slideIndex + 1} of ${slides.length}`}
            className={className}
            width="100%"
        >
            <Platform
                action={
                    <Text color="secondary" hasTabularNumbers type="supporting">
                        {slideIndex + 1} / {slides.length}
                    </Text>
                }
                activeTab={slide.href}
                isDevelopmentNoticeShown={false}
                tabs={slides}
            >
                {null}
            </Platform>
        </Stack>
    );
}

/** Renders a six-slide empty dashboard presentation. */
export default function Ppt() {
    const { search } = useLocation();
    const navigate = useNavigate();
    const slideId = new URLSearchParams(search).get('slide');
    const selectedSlideIndex = slides.findIndex((slide) => slide.id === slideId);
    const slideIndex = selectedSlideIndex === -1 ? 0 : selectedSlideIndex;
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
            <style>{printStyles}</style>
            <PresentationSlide className="ppt-screen-slide" slideIndex={slideIndex} />
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
            </Stack>
        </>
    );
}
