import Calculator from './Calculator';
import { Seo } from '@/components/Seo';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Token } from '@astryxdesign/core/Token';
import { useCasePaths } from '@/platform/usecases';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { PageContainer } from '@/components/PageContainer';
import { ArticleFooter } from '@/platform/components/Article';
import { ArrowRight, ClipboardCheck, FolderInput, ListChecks, Mail } from 'lucide-react';

// Record the authored page's actual revision date and repository source location.
const article = {
    lastUpdated: '2026-10-08',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/usecases/Screening.tsx',
};

/** Presents acquisition screening with its workflow summary and integrated calculator. */
export default function Screening() {
    // Use the standard 1000px Platform frame with a desktop illustration and flexible summary text.
    return (
        <>
            <Seo
                description="An illustrative Real Estate use case: organize property evidence, apply acquisition criteria, and record screening decisions in a LongLink Solution."
                title="Property Acquisition Screening | Real Estate | LongLink"
            />
            <PageContainer gap={8} padding={2}>
                <Stack gap={6}>
                    <Stack direction="horizontal" gap={6} align="stretch" wrap="wrap">
                        <Stack
                            align="center"
                            justify="center"
                            padding={4}
                            className="hidden size-40 shrink-0 overflow-hidden rounded-lg border border-border bg-surface md:flex"
                        >
                            <img
                                src="/images/property-screening.png"
                                alt="Property screening illustration with a house, magnifying glass, checklist, map, and financial chart."
                                className="w-full object-contain"
                                width={1312}
                                height={1199}
                                decoding="async"
                            />
                        </Stack>
                        <Stack gap={4} justify="between" className="min-w-0 flex-1 basis-64">
                            <Stack gap={2}>
                                <Heading level={1} className="font-(family-name:--font-family-handwritten)">
                                    Property Acquisition Screening
                                </Heading>
                                <Stack direction="horizontal" gap={1} wrap="wrap" aria-label="Use case tags">
                                    <Token label="Real Estate" size="sm" />
                                    <Token label="Investment Analysis" size="sm" />
                                    <Token label="Workflow Automation" size="sm" />
                                </Stack>
                            </Stack>
                            <Text as="p" color="secondary" textWrap="pretty">
                                Evaluate property investments faster and more consistently. Analyze property data,
                                financial viability, and acquisition risks against your investment criteria to identify
                                promising assets and make informed decisions.
                            </Text>
                        </Stack>
                    </Stack>
                    <Calculator />
                    <Stack as="section" gap={4} aria-labelledby="screening-workflow-title">
                        <Heading
                            level={2}
                            id="screening-workflow-title"
                            className="font-(family-name:--font-family-handwritten)"
                        >
                            How it works
                        </Heading>
                        <Grid columns={{ minWidth: 240, max: 3, repeat: 'fit' }} gap={6} columnGap={10}>
                            <Stack className="relative">
                                <Card className="rounded-none bg-transparent" padding={6} height="100%">
                                    <Stack gap={3} align="center">
                                        <Icon icon={FolderInput} size="lg" color="secondary" />
                                        <Stack gap={0} align="center">
                                            <Heading level={3} justify="center">
                                                Collect data
                                            </Heading>
                                            <Text
                                                as="p"
                                                color="secondary"
                                                textWrap="balance"
                                                justify="center"
                                                className="w-full max-w-64"
                                            >
                                                Import listings, financial statements, market data, and property
                                                documents
                                            </Text>
                                        </Stack>
                                    </Stack>
                                </Card>
                                <Stack
                                    className="absolute inset-y-0 -end-5 translate-x-1/2 hidden lg:flex"
                                    justify="center"
                                >
                                    <Icon icon={ArrowRight} size="md" color="secondary" />
                                </Stack>
                            </Stack>
                            <Stack className="relative">
                                <Card className="rounded-none bg-transparent" padding={6} height="100%">
                                    <Stack gap={3} align="center">
                                        <Icon icon={ListChecks} size="lg" color="secondary" />
                                        <Stack gap={0} align="center">
                                            <Heading level={3} justify="center">
                                                Evaluate acquisition
                                            </Heading>
                                            <Text
                                                as="p"
                                                color="secondary"
                                                textWrap="balance"
                                                justify="center"
                                                className="w-full max-w-64"
                                            >
                                                Calculate investment metrics, apply screening criteria, and identify
                                                risks
                                            </Text>
                                        </Stack>
                                    </Stack>
                                </Card>
                                <Stack
                                    className="absolute inset-y-0 -end-5 translate-x-1/2 hidden lg:flex"
                                    justify="center"
                                >
                                    <Icon icon={ArrowRight} size="md" color="secondary" />
                                </Stack>
                            </Stack>
                            <Card className="rounded-none bg-transparent" padding={6}>
                                <Stack gap={3} align="center">
                                    <Icon icon={ClipboardCheck} size="lg" color="secondary" />
                                    <Stack gap={0} align="center">
                                        <Heading level={3} justify="center">
                                            Generate assessment
                                        </Heading>
                                        <Text
                                            as="p"
                                            color="secondary"
                                            textWrap="balance"
                                            justify="center"
                                            className="w-full max-w-64"
                                        >
                                            Score opportunities, flag exceptions, and produce review-ready reports
                                        </Text>
                                    </Stack>
                                </Stack>
                            </Card>
                        </Grid>
                    </Stack>
                    <Stack as="section" gap={4} aria-labelledby="screening-build-title">
                        <Heading
                            level={2}
                            id="screening-build-title"
                            className="font-(family-name:--font-family-handwritten)"
                        >
                            Why LongLink?
                        </Heading>
                        <Text as="p" color="secondary" textWrap="pretty">
                            Build property screening applications around your investment criteria, data sources, and
                            approval workflows. LongLink helps you automate repetitive analysis while keeping control of
                            your models, integrations, and application logic.
                        </Text>
                        <Stack gap={3} align="center" paddingBlockStart={6}>
                            <Text as="p" size="xl" weight="semibold" justify="center" textWrap="balance">
                                Create your Solution
                            </Text>
                            <Stack direction="horizontal" gap={3} align="center" justify="center" wrap="wrap">
                                <Button
                                    href="/login/"
                                    label="Get Started"
                                    variant="primary"
                                    endContent={<Icon icon={ArrowRight} />}
                                />
                                <Button
                                    href="mailto:info@longlink.dev"
                                    label="Contact us"
                                    variant="secondary"
                                    icon={<Icon icon={Mail} />}
                                />
                            </Stack>
                        </Stack>
                    </Stack>
                </Stack>
                <Stack as="footer" gap={3} paddingBlockStart={8}>
                    <ArticleFooter
                        lastUpdated={article.lastUpdated}
                        editUrl={article.editUrl}
                        editLabel="Edit this page on GitHub"
                        paths={useCasePaths}
                    />
                </Stack>
            </PageContainer>
        </>
    );
}
