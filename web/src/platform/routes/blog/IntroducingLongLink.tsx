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
                                    Generative AI has changed how software is built, opening two paths from traditional
                                    coding.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    In one direction, we delegate the work to an agent and trust its implementation,
                                    hoping that tomorrow&apos;s model will fix today&apos;s issues. Without careful
                                    review, the solution can gradually become a black box that is difficult to audit,
                                    debug, and maintain.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    The other path keeps human judgment at the center. AI serves as a tool that
                                    accelerates the work, while humans remain responsible for key decisions,
                                    architecture, and validation. This keeps the development process transparent, making
                                    assumptions, trade-offs, and errors easier to identify and understand.
                                </Text>
                                <Card
                                    className="handwritten-diagram relative overflow-hidden"
                                    padding={0}
                                    variant="transparent"
                                >
                                    <img
                                        alt="Classical coding branches into hybrid coding and vibe coding"
                                        className="aspect-video w-full object-contain"
                                        src="/images/paths.png"
                                    />
                                    <Stack className="absolute start-1/4 top-1/2 -translate-x-1/2 -translate-y-3 sm:-translate-y-6 md:-translate-y-8">
                                        <Text
                                            className="text-sm sm:text-xl md:text-2xl"
                                            hasCapsize
                                            textWrap="nowrap"
                                            type="display-3"
                                            weight="semibold"
                                        >
                                            Classical Coding
                                        </Text>
                                    </Stack>
                                    <Stack className="absolute bottom-1/6 start-5/6 top-5/12 translate-y-2 -translate-x-1/2">
                                        <Text
                                            className="text-sm sm:text-xl md:text-2xl"
                                            hasCapsize
                                            textWrap="nowrap"
                                            type="display-3"
                                            weight="semibold"
                                        >
                                            Hybrid Coding
                                        </Text>
                                        <Stack className="absolute start-0 top-full -translate-y-1">
                                            <Text
                                                className="text-sm sm:text-xl md:text-2xl"
                                                hasCapsize
                                                textWrap="nowrap"
                                                type="display-3"
                                                weight="semibold"
                                            >
                                                Vibe Coding
                                            </Text>
                                        </Stack>
                                    </Stack>
                                </Card>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    The difference becomes clearer over time. A fast initial implementation can come at
                                    the cost of long-term maintainability. Without sound engineering and sufficient
                                    oversight, technical debt accumulates, and the initial speed advantage can be eroded
                                    by the cost of maintaining and changing the software.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    LongLink is built around this challenge. Three fundamental principles guide its
                                    design and development.
                                </Text>
                            </Stack>
                        </Stack>

                        <Stack as="section" gap={6}>
                            <Stack gap={4}>
                                <Stack direction="horizontal" gap={3} vAlign="start">
                                    <Icon className="mt-1" color="accent" icon={Minimize2} size="lg" />
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        <Text color="primary" weight="semibold">
                                            Keep it simple
                                        </Text>
                                        <br />
                                        A clear, simple process is easier to operate, understand, and audit. It is also
                                        less expensive to maintain. As complexity grows, keeping things simple requires
                                        deliberate choices.
                                    </Text>
                                </Stack>
                                <Stack direction="horizontal" gap={3} vAlign="start">
                                    <Icon className="mt-1" color="accent" icon={ShieldCheck} size="lg" />
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        <Text color="primary" weight="semibold">
                                            Own the process
                                        </Text>
                                        <br />
                                        Ownership means retaining control over your data, workflows, and the software
                                        that supports them. It also means being accountable for how the process works
                                        and ensuring it fits your requirements. Geopolitical uncertainty makes
                                        understanding and managing these dependencies even more important.
                                    </Text>
                                </Stack>
                                <Stack direction="horizontal" gap={3} vAlign="start">
                                    <Icon className="mt-1" color="accent" icon={Split} size="lg" />
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        <Text color="primary" weight="semibold">
                                            Separate responsibilities
                                        </Text>
                                        <br />
                                        People remain responsible for decisions and judgment; machines execute clearly
                                        defined tasks. Business users define how the work should happen, while
                                        developers translate those requirements into reliable software.
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
                                    The vision
                                </Heading>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Modern software development provides a useful model. Developers can work locally,
                                    while shared repositories and cloud services bring together code, history,
                                    collaboration, and automated checks. Changes can be understood, reviewed, tested,
                                    and traced over time.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    A well-maintained repository brings implementation, documentation, and tests into
                                    one place. Combined with access to relevant tools and services, this gives both
                                    developers and AI agents the context they need to work with less guesswork.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Business operations rarely have the same structure. Data and processes are often
                                    scattered across legacy systems, low-code platforms, spreadsheets, databases,
                                    documents, and disconnected applications. Understanding how a process works means
                                    piecing together information from all of them.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    LongLink aims to bring the discipline of software development to business
                                    applications: a shared platform where processes, application logic, data, and
                                    workflows can be managed together. It provides the foundation to build, deploy,
                                    operate, and govern solutions, giving developers, business users, and agents a
                                    structured environment in which to work.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={6} paddingBlockStart={2}>
                                <Stack gap={4}>
                                    <Heading level={2} textWrap="balance" type="display-3">
                                        How it works
                                    </Heading>
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        Building a custom solution from end to end gives you the greatest flexibility.
                                        You can shape it around the exact requirements of a process. That flexibility
                                        comes at a cost, however: everything surrounding the core application logic must
                                        also be implemented and maintained.
                                    </Text>
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        Deployment is an obvious example. The application needs somewhere to run, along
                                        with the infrastructure to keep it available. Managed deployment platforms
                                        simplify this work.
                                    </Text>
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        Then come the services the application depends on: authentication, permissions,
                                        storage, and user management. Existing services provide these capabilities
                                        through APIs and SDKs—interfaces and libraries that help developers connect them
                                        to an application.
                                    </Text>
                                    <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                        These services reduce the amount of software you need to build, but integrating
                                        them remains part of the work. Developers still need to connect them to the
                                        application logic, make them work together, and maintain those connections as
                                        the solution evolves.
                                    </Text>
                                </Stack>
                                <Card
                                    className="handwritten-diagram relative overflow-hidden"
                                    padding={0}
                                    variant="transparent"
                                >
                                    <img
                                        alt="Core application logic surrounded by services and deployment infrastructure"
                                        className="aspect-video w-full object-contain"
                                        src="/images/platform.png"
                                    />
                                    <Text
                                        className="absolute start-3/10 top-1/5 -translate-x-1/2 text-sm sm:text-xl md:text-2xl"
                                        hasCapsize
                                        textWrap="nowrap"
                                        type="display-3"
                                        weight="semibold"
                                    >
                                        Services
                                    </Text>
                                    <Text
                                        className="absolute bottom-1/5 start-7/10 -translate-x-1/2 text-sm sm:text-xl md:text-2xl"
                                        hasCapsize
                                        textWrap="nowrap"
                                        type="display-3"
                                        weight="semibold"
                                    >
                                        Deployment
                                    </Text>
                                </Card>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    LongLink brings these common capabilities into a shared foundation, allowing
                                    developers to focus on the logic of the process itself.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Its focus is internal business applications, where software must align closely with
                                    an organization&apos;s workflows, responsibilities, and requirements. The process
                                    determines how the application should work.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    The application logic remains conventional Python code. Python offers readable
                                    syntax and a broad ecosystem, with established libraries such as FastAPI, Pydantic,
                                    SQLAlchemy, and Alembic providing the building blocks for APIs, validation, data
                                    access, and database migrations.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    The code lives in a repository and follows standard software-engineering practices:
                                    testing, code review, versioning, automated deployment, and releases.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    We call this a{' '}
                                    <Text color="primary" weight="semibold">
                                        Solution
                                    </Text>
                                    : a repository that captures how a process works through its code, configuration,
                                    documentation, and tests. It can be inspected, reviewed, maintained, and adapted as
                                    requirements, processes, or regulations change.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    LongLink provides the infrastructure around each Solution. Each organization
                                    receives a dedicated database and storage bucket, while every deployed Solution runs
                                    in an isolated namespace with its own resources.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    Developers focus on implementing the process, business users define and validate its
                                    requirements, and LongLink handles the common infrastructure needed to run it.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={4} paddingBlockStart={2}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    What’s next
                                </Heading>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    The core architecture is complete, and the public beta is live. Try it, test it, and
                                    break it.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    LongLink is open source.{' '}
                                    <Link
                                        hasUnderline
                                        href="https://github.com/xLongLink/longlink"
                                        isExternalLink
                                        type="inherit"
                                    >
                                        Leave us a star on GitHub
                                    </Link>{' '}
                                    and help us build what comes next.
                                </Text>
                                <Text as="p" className="text-justify" color="secondary" textWrap="pretty">
                                    For questions, feedback, or collaboration, reach out at{' '}
                                    <Link hasUnderline href="mailto:info@longlink.dev" type="inherit">
                                        info@longlink.dev
                                    </Link>
                                    .
                                </Text>
                            </Stack>
                        </Stack>

                        <Stack as="footer" gap={3} paddingBlockStart={6}>
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
