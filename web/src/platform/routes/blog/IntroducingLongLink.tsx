import { Seo } from '@/components/Seo';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { ArrowLeft, ArrowRight, GitFork, LockKeyhole, Minimize2 } from 'lucide-react';

const articleDescription =
    'LongLink is an open-source foundation for turning real-world processes into maintainable business software built with Python.';

/** Renders the introductory LongLink article. */
export default function IntroducingLongLink() {
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        author: { '@type': 'Person', name: 'Leonardo Saurwein' },
        datePublished: '2026-09-04',
        description: articleDescription,
        headline: 'Introducing LongLink',
        mainEntityOfPage: 'https://longlink.dev/blog/introducing-longlink/',
        publisher: { '@type': 'Organization', name: 'LongLink', url: 'https://longlink.dev' },
    };

    return (
        <>
            <Seo
                description={articleDescription}
                structuredData={structuredData}
                title="Introducing LongLink | LongLink Blog"
            />
            <Stack as="main">
                <Section padding={6} paddingBlock={10} variant="transparent">
                    <Stack as="article" className="mx-auto" gap={10} maxWidth={720} width="100%">
                        <Stack as="header" gap={6}>
                            <Stack gap={3}>
                                <Text color="accent" type="supporting" weight="semibold">
                                    September 4, 2026 | 6 min read
                                </Text>
                                <Heading level={1} textWrap="balance" type="display-1">
                                    Introducing LongLink
                                </Heading>
                                <Text as="p" color="secondary" textWrap="pretty" type="large">
                                    AI changed the economics of software creation. LongLink provides the engineering
                                    foundation needed to make that shift last.
                                </Text>
                            </Stack>
                        </Stack>

                        <Card className="overflow-hidden" padding={0} variant="transparent">
                            <img
                                alt="A classical coding path splitting toward transparent and opaque software"
                                className="aspect-video w-full object-cover"
                                src="/images/paths.png"
                            />
                        </Card>

                        <Stack gap={10}>
                            <Stack as="section" gap={4}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    The economics have shifted
                                </Heading>
                                <Text as="p" color="secondary" textWrap="pretty">
                                    AI has made useful software faster and cheaper to create. Workflows that once had to
                                    fit inside a spreadsheet, a general-purpose SaaS product, or a manual workaround can
                                    now be expressed directly in code. Dedicated software is becoming practical for far
                                    more organizations and far more specific problems.
                                </Text>
                                <Text as="p" color="secondary" textWrap="pretty">
                                    But the first version is only the beginning. Without sound engineering foundations,
                                    early speed turns into complexity, fragility, and technical debt. The question is no
                                    longer only whether software can be generated. It is whether that software can
                                    remain understandable, operable, and useful over time.
                                </Text>
                            </Stack>

                            <Divider />

                            <Stack as="section" gap={4}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    Between classical and opaque coding
                                </Heading>
                                <Text as="p" color="secondary" textWrap="pretty">
                                    Classical development gives teams control, but asks them to assemble every layer.
                                    Low-code platforms and newer vibe tools can move quickly, but often hide the system
                                    behind an opaque box. That tradeoff becomes costly when a process changes, an
                                    integration breaks, or accountability matters.
                                </Text>
                                <Text as="p" color="secondary" textWrap="pretty">
                                    LongLink takes a hybrid path. The solution remains code: inspectable, reviewable,
                                    testable, and owned by the people building it. The repetitive operational foundation
                                    becomes a platform concern. Modern AI-assisted tools can help create the solution,
                                    while ordinary software-engineering practices keep it maintainable.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={4}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    Built for the work between categories
                                </Heading>
                                <Text as="p" color="secondary" textWrap="pretty">
                                    Real organizations rarely fit a generic template. Their regulations, data,
                                    geography, responsibilities, and sequence of decisions create a distinct operating
                                    context. Existing choices force that context into legacy systems, low-code
                                    platforms, SaaS applications, spreadsheets, manual workflows, or a web of
                                    workarounds.
                                </Text>
                                <Text as="p" color="secondary" textWrap="pretty">
                                    LongLink is for the process that deserves a system shaped around it. A project
                                    becomes a LongLink Solution: dedicated business software built in Python, with the
                                    business rules kept close to the people who understand them.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={6}>
                                <Stack gap={4}>
                                    <Heading level={2} textWrap="balance" type="display-3">
                                        Code on one side, a platform underneath
                                    </Heading>
                                    <Text as="p" color="secondary" textWrap="pretty">
                                        Developers focus on business logic. The LongLink Platform handles the common
                                        services and infrastructure around each solution: authentication, permissions,
                                        deployment, storage, routing, logging, governance, and operational structure.
                                        Users define how the work should happen; the platform provides a consistent way
                                        to run it.
                                    </Text>
                                </Stack>
                                <Card className="overflow-hidden" padding={0} variant="transparent">
                                    <img
                                        alt="An AI assistant connected to a LongLink solution, services, and infrastructure"
                                        className="aspect-video w-full object-contain"
                                        src="/images/platform.png"
                                    />
                                </Card>
                            </Stack>

                            <Stack as="section" gap={6}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    Three principles
                                </Heading>
                                <Grid columns={{ minWidth: 200, max: 3, repeat: 'fit' }} gap={6}>
                                    <Stack gap={3}>
                                        <Icon color="accent" icon={Minimize2} size="lg" />
                                        <Heading level={3}>Keep it simple</Heading>
                                        <Text as="p" color="secondary" textWrap="pretty">
                                            Processes should be clear, easy to operate, and economical to maintain.
                                        </Text>
                                    </Stack>
                                    <Stack gap={3}>
                                        <Icon color="accent" icon={GitFork} size="lg" />
                                        <Heading level={3}>Separate responsibilities</Heading>
                                        <Text as="p" color="secondary" textWrap="pretty">
                                            Make a clear distinction between a machine task and a human decision.
                                        </Text>
                                    </Stack>
                                    <Stack gap={3}>
                                        <Icon color="accent" icon={LockKeyhole} size="lg" />
                                        <Heading level={3}>Own the process</Heading>
                                        <Text as="p" color="secondary" textWrap="pretty">
                                            Retain control, accountability, and software that fits the work.
                                        </Text>
                                    </Stack>
                                </Grid>
                            </Stack>

                            <Divider />

                            <Stack as="section" gap={4}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    The road ahead
                                </Heading>
                                <Text as="p" color="secondary" textWrap="pretty">
                                    LongLink is in active development. The immediate work is to strengthen the platform,
                                    expand the SDK, and prove the model through real solutions. The project is open
                                    source so that its foundations, tradeoffs, and progress remain visible.
                                </Text>
                                <Text as="p" color="secondary" textWrap="pretty">
                                    The goal is straightforward: make dedicated software a durable option for the many
                                    processes that sit between an off-the-shelf product and a fully bespoke stack.
                                </Text>
                            </Stack>
                        </Stack>

                        <Stack as="footer" gap={3}>
                            <Stack
                                aria-label="Blog post navigation"
                                direction="horizontal"
                                hAlign="between"
                                width="100%"
                            >
                                <Button icon={<Icon icon={ArrowLeft} size="sm" />} isDisabled label="Previous" />
                                <Button endContent={<Icon icon={ArrowRight} size="sm" />} isDisabled label="Next" />
                            </Stack>
                            <Divider />
                            <Stack direction="horizontal" gap={3} hAlign="between" vAlign="center" wrap="wrap">
                                <Text type="supporting">Last updated: September 4, 2026</Text>
                                <Link
                                    hasUnderline
                                    href="https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/blog/IntroducingLongLink.tsx"
                                    isExternalLink
                                    type="supporting"
                                >
                                    Edit this page in GitHub
                                </Link>
                            </Stack>
                        </Stack>
                    </Stack>
                </Section>
            </Stack>
        </>
    );
}
