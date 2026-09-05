import { Seo } from '@/components/Seo';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { ArrowLeft, ArrowRight, Minimize2, ShieldCheck, Split } from 'lucide-react';

const articleDescription =
    'LongLink is an open-source Python foundation for turning real-world processes into maintainable business software.';

/** Renders the introductory LongLink article. */
export default function IntroducingLongLink() {
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        author: { '@type': 'Person', name: 'Leonardo Saurwein' },
        dateModified: '2026-09-05',
        datePublished: '2026-09-04',
        description: articleDescription,
        headline: 'Introducing LongLink',
        image: 'https://longlink.dev/images/paths.png',
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
                    <Stack as="article" className="mx-auto" gap={6} maxWidth={720} width="100%">
                        <Stack as="header" gap={6}>
                            <Stack gap={3}>
                                <Text color="accent" type="supporting" weight="semibold">
                                    September 4, 2026 | 3 min read
                                </Text>
                                <Heading level={1} textWrap="balance" type="display-1">
                                    Introducing <Wordmark size="inherit" />
                                </Heading>
                            </Stack>
                        </Stack>

                        <Stack as="section" gap={6}>
                            <Stack gap={4}>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Generative AI has changed how software is built.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Two narratives have emerged. In one direction, we fully delegate the work to an
                                    agent and simply trust its implementation, hoping that tomorrow&apos;s model will
                                    fix today&apos;s issues. This approach can be dangerous, as the solution gradually
                                    becomes a black box that is difficult to audit, debug, and maintain.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    The other path sees AI as a tool rather than a replacement for human judgment.
                                    Humans remain responsible for the key decisions, architecture, and validation of the
                                    solution. This keeps the development process transparent, making assumptions,
                                    trade-offs, and errors easier to understand and audit.
                                </Text>
                                <Card className="overflow-hidden" padding={0} variant="transparent">
                                    <img
                                        alt="Two development paths leading to a transparent white box and an opaque black box"
                                        className="aspect-video w-full object-contain"
                                        src="/images/paths.png"
                                    />
                                </Card>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Initial implementation speed can come at the cost of long-term maintainability.
                                    Technical debt is key to understanding this trade-off: AI can dramatically
                                    accelerate development, but without sufficient human oversight, complexity
                                    accumulates and the initial speed advantage is gradually offset by higher
                                    maintenance costs.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    This idea is at the core of LongLink. In particular, three fundamental principles
                                    have guided its design and development:
                                </Text>
                            </Stack>
                        </Stack>

                        <Stack as="section" gap={6}>
                            <Stack gap={4}>
                                <Stack direction="horizontal" gap={3} vAlign="start">
                                    <Icon className="mt-1" color="accent" icon={Minimize2} size="lg" />
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        <Text color="primary" weight="semibold">
                                            Keep it simple:
                                        </Text>
                                        <br />
                                        In a world of growing complexity, simplicity becomes a luxury. A clear and
                                        simple process is easier to operate, reason about, and audit, and less expensive
                                        to maintain.
                                    </Text>
                                </Stack>
                                <Stack direction="horizontal" gap={3} vAlign="start">
                                    <Icon className="mt-1" color="accent" icon={ShieldCheck} size="lg" />
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        <Text color="primary" weight="semibold">
                                            Own the process:
                                        </Text>
                                        <br />
                                        Ownership, control, and accountability are fundamental to building resilient
                                        infrastructure. They matter even more amid geopolitical uncertainty, where
                                        control over data and workflows matters more than ever.
                                    </Text>
                                </Stack>
                                <Stack direction="horizontal" gap={3} vAlign="start">
                                    <Icon className="mt-1" color="accent" icon={Split} size="lg" />
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        <Text color="primary" weight="semibold">
                                            Separate responsibilities:
                                        </Text>
                                        <br />
                                        Responsibilities should be clearly separated between human decisions and
                                        machine-executed tasks, and between technical implementation and business
                                        requirements.
                                    </Text>
                                </Stack>
                            </Stack>
                            <Card className="overflow-hidden" padding={0} variant="transparent">
                                <img
                                    alt="Human and robot hands reaching toward each other"
                                    className="w-full object-contain"
                                    src="/images/human-robot-hands.png"
                                />
                            </Card>
                        </Stack>

                        <Stack gap={10} paddingBlockStart={6}>
                            <Stack as="section" gap={4}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    The Vision
                                </Heading>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Most companies currently bridge the gaps between their systems with spreadsheets,
                                    forms, dashboards, email, scripts, and AI-generated tools. The pieces may work, but
                                    the business logic becomes distributed across them. Processes grow harder to
                                    understand, govern, and maintain.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Other platforms can make custom software faster to assemble, but often require the
                                    result to stay within proprietary environments, data models, or deployment systems.
                                    LongLink instead lets organizations retain control of their source code, data,
                                    workflows, and integrations. The value created through customization remains
                                    available, portable, and adaptable as requirements change.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={6} paddingBlockStart={2}>
                                <Stack gap={4}>
                                    <Heading level={2} textWrap="balance" type="display-3">
                                        How does it work
                                    </Heading>
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        LongLink is an open-source foundation for building, deploying, and operating
                                        business software with standard Python tools. It separates the code that
                                        describes a process from the shared services required to run that code reliably.
                                    </Text>
                                </Stack>
                                <Card className="overflow-hidden" padding={0} variant="transparent">
                                    <img
                                        alt="An AI assistant connected to a LongLink solution, services, and infrastructure"
                                        className="aspect-video w-full object-contain"
                                        src="/images/platform.png"
                                    />
                                </Card>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Each project becomes a LongLink Solution: a standard Python and FastAPI service
                                    containing its data models, rules, workflows, integrations, routes, and interfaces.
                                    Developers focus on business logic they can inspect, review, test, and change, while
                                    the LongLink Platform handles authentication, permissions, deployment, storage,
                                    routing, logging, governance, and operational structure. Users define how the work
                                    should happen, and every Solution gets a consistent foundation without rebuilding
                                    those common services for each process.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={4} paddingBlockStart={2}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    What next
                                </Heading>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    LongLink is in active development. The immediate work is to strengthen the Platform,
                                    expand the Solution SDK, and prove the model through real systems. The project is
                                    open source so its foundations, tradeoffs, and progress remain visible.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    The goal is simple: make dedicated software a durable option for the real-world
                                    processes that are too important to remain a collection of workarounds.
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
                                <Text type="supporting">Last updated: September 5, 2026</Text>
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
