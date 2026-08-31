import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { useEffect, useEffectEvent } from 'react';
import Platform from '@/platform/layouts/Platform';
import { Divider } from '@astryxdesign/core/Divider';
import baserowIcon from '@/components/svg/baserow.svg';
import tooljetIcon from '@/components/svg/tooljet.svg';
import { useLocation, useNavigate } from 'react-router';
import budibaseIcon from '@/components/svg/budibase.svg';
import windmillIcon from '@/components/svg/windmill.svg';
import retoolIcon from '@/components/svg/retool-icon.svg';
import { proportional, Table } from '@astryxdesign/core/Table';
import humanRobotHands from '@/components/svg/HumanRobotHands.svg';
import airtableIcon from '@/components/svg/airtable-svgrepo-com.svg';
import {
    ArrowRight,
    Blocks,
    BookOpen,
    Cloud,
    FileSpreadsheet,
    GitFork,
    Hand,
    LockKeyhole,
    Minimize2,
    Server,
    Sparkles,
    Swords,
    TriangleAlert,
    Target,
    Users,
    Wrench,
} from 'lucide-react';

const slides = [
    { href: '/ppt?slide=introduction', icon: BookOpen, id: 'introduction', label: 'Introduction' },
    { href: '/ppt?slide=problem', icon: TriangleAlert, id: 'problem', label: 'Problem' },
    { href: '/ppt?slide=competitors', icon: Swords, id: 'competitors', label: 'Competitors' },
    { href: '/ppt?slide=goal', icon: Target, id: 'goal', label: 'Goal' },
    { href: '/ppt?slide=how', icon: Wrench, id: 'how', label: 'How' },
    { href: '/ppt?slide=team', icon: Users, id: 'team', label: 'Team' },
] as const;

type CompetitorRow = {
    avatar: string;
    language: string;
    license: string;
    product: string;
    release: string;
    solution: string;
};

const competitorRows: CompetitorRow[] = [
    {
        avatar: airtableIcon,
        product: 'Airtable',
        release: '2015',
        license: 'Proprietary',
        solution: 'Low Code',
        language: 'JavaScript, React',
    },
    {
        avatar: retoolIcon,
        product: 'Retool',
        release: '2018',
        license: 'Proprietary',
        solution: 'Hybrid',
        language: 'React, TypeScript',
    },
    {
        avatar: '/images/appsmith.png',
        product: 'Appsmith',
        release: '2020',
        license: 'Apache-2.0',
        solution: 'Hybrid',
        language: 'JavaScript, SQL',
    },
    {
        avatar: baserowIcon,
        product: 'Baserow',
        release: '2020',
        license: 'MIT',
        solution: 'Hybrid',
        language: 'Python, Vue',
    },
    {
        avatar: budibaseIcon,
        product: 'Budibase',
        release: '2020',
        license: 'GPLv3',
        solution: 'Hybrid',
        language: 'JavaScript',
    },
    {
        avatar: '/images/smartsuite.png',
        product: 'SmartSuite',
        release: '2021',
        license: 'Proprietary',
        solution: 'Low Code',
        language: 'None',
    },
    {
        avatar: tooljetIcon,
        product: 'ToolJet',
        release: '2021',
        license: 'AGPLv3',
        solution: 'Hybrid',
        language: 'JavaScript, Python',
    },
    {
        avatar: windmillIcon,
        product: 'Windmill',
        release: '2022',
        license: 'AGPLv3',
        solution: 'Hybrid',
        language: 'Python, TypeScript, Go, Bash, SQL',
    },
];

const howLayers = [
    {
        description: 'Authentication, permissions, deployment, storage, and logging.',
        label: 'Focus on the solution',
        width: '52%',
    },
    {
        description: 'FastAPI, Pydantic, SQLAlchemy, Alembic, and more.',
        label: "Don't reinvent the wheel",
        width: '76%',
    },
    {
        description: 'Git, CI/CD, code editors, package managers, issue trackers, and more.',
        label: 'Use the right tool for the Job',
        width: '100%',
    },
] as const;

/** Renders the process stages covered by a problem source. */
function ProcessCoverage({ stages }: { stages: readonly string[] }) {
    return (
        <Stack align="center" direction="horizontal" gap={0.5}>
            {stages.map((stage, index) => (
                <Stack align="center" direction="horizontal" gap={0.5} key={stage}>
                    <Text textWrap="nowrap" type="supporting">
                        {stage}
                    </Text>
                    {index < stages.length - 1 ? <ArrowRight aria-hidden className="text-secondary" size={12} /> : null}
                </Stack>
            ))}
        </Stack>
    );
}

/** Renders the practical principles as a card pyramid. */
function HowPyramid() {
    return (
        <Stack align="center" gap={2} maxWidth={640} width="100%">
            {howLayers.map(({ description, label, width }) => (
                <Card height={120} key={label} variant="muted" width={width}>
                    <Stack align="center" gap={0.5} height="100%" justify="center">
                        <Text justify="center" textWrap="balance" type="large" weight="semibold">
                            {label}
                        </Text>
                        <Text color="secondary" justify="center" textWrap="balance" type="supporting">
                            {description}
                        </Text>
                    </Stack>
                </Card>
            ))}
        </Stack>
    );
}

const printStyles = `
    .ppt-screen-slide {
        display: flex;
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
        box-sizing: border-box;
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
            margin: 0;
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
function PresentationSlide({
    className,
    isScreen = false,
    slideIndex,
}: {
    className?: string;
    isScreen?: boolean;
    slideIndex: number;
}) {
    const slide = slides[slideIndex];
    const content =
        slide.id === 'introduction' ? (
            <Stack align="center" direction="horizontal" gap={2}>
                <Text hasCapsize type="display-3" weight="semibold">
                    Design
                </Text>
                <ArrowRight aria-hidden className="text-primary" size={24} />
                <Text hasCapsize type="display-3" weight="semibold">
                    Build
                </Text>
                <ArrowRight aria-hidden className="text-primary" size={24} />
                <Text hasCapsize type="display-3" weight="semibold">
                    Operate
                </Text>
                <ArrowRight aria-hidden className="text-primary" size={24} />
                <Text hasCapsize type="display-3" weight="semibold">
                    Improve
                </Text>
            </Stack>
        ) : slide.id === 'problem' ? (
            <Stack align="center" gap={2} maxWidth={832} width="100%">
                <Grid columns={2} gap={2} justify="center" maxWidth={552} width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Server aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Legacy systems
                            </Text>
                            <ProcessCoverage stages={['Operate']} />
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Blocks aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Low-code platforms
                            </Text>
                            <ProcessCoverage stages={['Design', 'Build', 'Operate']} />
                        </Stack>
                    </Card>
                </Grid>
                <Grid columns={3} gap={2} justify="center" width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Cloud aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                SaaS applications
                            </Text>
                            <ProcessCoverage stages={['Operate']} />
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <FileSpreadsheet aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Excel
                            </Text>
                            <ProcessCoverage stages={['Design', 'Build', 'Operate', 'Improve']} />
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Sparkles aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Vibe tools
                            </Text>
                            <ProcessCoverage stages={['Design', 'Build']} />
                        </Stack>
                    </Card>
                </Grid>
                <Grid columns={2} gap={2} justify="center" maxWidth={552} width="100%">
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Hand aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Manual workflows
                            </Text>
                            <ProcessCoverage stages={['Operate']} />
                        </Stack>
                    </Card>
                    <Card height={120} variant="muted" width={272}>
                        <Stack align="center" gap={1} height="100%" justify="center">
                            <Wrench aria-hidden className="text-accent" size={16} />
                            <Text type="large" weight="semibold">
                                Workarounds
                            </Text>
                            <ProcessCoverage stages={['Build', 'Operate']} />
                        </Stack>
                    </Card>
                </Grid>
            </Stack>
        ) : slide.id === 'competitors' ? (
            <Stack maxWidth={840} width="100%">
                <Table
                    columns={[
                        {
                            key: 'product',
                            align: 'start',
                            header: '',
                            width: proportional(2),
                            renderCell: (competitor) => (
                                <Stack align="center" direction="horizontal" gap={2}>
                                    <Avatar kind="organization" name={competitor.product} src={competitor.avatar} />
                                    <Stack align="start">
                                        <Text weight="semibold">{competitor.product}</Text>
                                        <Text color="secondary" type="supporting">
                                            {competitor.release} - {competitor.license}
                                        </Text>
                                    </Stack>
                                </Stack>
                            ),
                        },
                        { key: 'solution', align: 'center', header: 'Solution', width: proportional(1) },
                        { key: 'language', align: 'center', header: 'Language', width: proportional(2) },
                    ]}
                    data={competitorRows}
                    density="compact"
                    dividers="grid"
                    idKey="product"
                />
            </Stack>
        ) : slide.id === 'goal' ? (
            <Stack className="relative" height="100%" width="100%">
                <img
                    alt="Human and robot hands reaching toward each other"
                    className="w-full -translate-y-4 pointer-events-none select-none object-contain"
                    draggable={false}
                    src={humanRobotHands}
                />
                <Stack className="absolute bottom-16 start-12">
                    <Stack gap={8}>
                        <Stack align="center" direction="horizontal" gap={3}>
                            <Minimize2 aria-hidden className="text-accent" size={24} />
                            <Text hasCapsize type="display-3" weight="semibold">
                                Keep it simple
                            </Text>
                        </Stack>
                        <Stack align="center" direction="horizontal" gap={3}>
                            <GitFork aria-hidden className="text-accent" size={24} />
                            <Text hasCapsize type="display-3" weight="semibold">
                                Separate responsibilities
                            </Text>
                        </Stack>
                        <Stack align="center" direction="horizontal" gap={3}>
                            <LockKeyhole aria-hidden className="text-accent" size={24} />
                            <Text hasCapsize type="display-3" weight="semibold">
                                Own the process
                            </Text>
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>
        ) : slide.id === 'how' ? (
            <HowPyramid />
        ) : slide.id === 'team' ? (
            <Stack align="center" gap={3}>
                <Text as="h1" hasCapsize type="display-3" weight="semibold">
                    Leonardo Saurwein
                </Text>
                <Stack align="center" gap={3}>
                    <Text type="large">BSc in Mechanical Engineering at ETHZ</Text>
                    <Divider />
                    <Stack align="center" gap={1}>
                        <Text color="secondary" type="large">
                            Elegant solutions for complex problems
                        </Text>
                        <Text color="secondary" type="large">
                            Strongly belive in open source
                        </Text>
                        <Text color="secondary" type="large">
                            Against free labour
                        </Text>
                    </Stack>
                </Stack>
            </Stack>
        ) : null;
    const platform = (
        <Platform
            action={
                <Text color="secondary" hasTabularNumbers type="supporting">
                    {slideIndex + 1} / {slides.length}
                </Text>
            }
            activeTab={slide.href}
            contentMinHeight="100%"
            isContentCentered
            isDevelopmentNoticeShown={false}
            tabs={slides}
        >
            {content}
        </Platform>
    );

    return (
        <Stack
            as="section"
            aria-label={`Slide ${slideIndex + 1} of ${slides.length}`}
            className={className}
            width="100%"
        >
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

/** Renders an eight-slide dashboard presentation. */
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
