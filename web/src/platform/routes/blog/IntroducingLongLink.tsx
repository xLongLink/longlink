import { Seo } from '@/components/Seo';
import { siteName, siteUrl } from '@/site';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const articleDescription =
    'LongLink provides a shared foundation for building, deploying, and operating process-specific Python applications.';

/** Renders the introductory LongLink article. */
export default function IntroducingLongLink() {
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        author: { '@type': 'Person', name: 'Leonardo Saurwein' },
        dateModified: '2026-09-25',
        datePublished: '2026-09-22',
        description: articleDescription,
        headline: 'Introducing LongLink',
        image: `${siteUrl}/images/introducing-longlink.png`,
        mainEntityOfPage: `${siteUrl}/blog/introducing-longlink/`,
        publisher: { '@type': 'Organization', name: siteName, url: siteUrl },
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
                        <Stack as="header" gap={3}>
                            <Text color="secondary" type="supporting" weight="medium">
                                September 22, 2026 | 3 min read
                            </Text>
                            <Heading level={1} textWrap="balance" type="display-1">
                                Introducing LongLink
                            </Heading>
                        </Stack>

                        <Stack gap={10}>
                            <Stack as="section" gap={4}>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    Software is becoming faster and cheaper to build. A company no longer has to fit
                                    every process into an existing SaaS product simply because a tailored application
                                    would take too long to create.
                                </Text>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    But building an application is only part of the work. It still needs authentication,
                                    permissions, storage, deployment, and a way to understand what is running. When
                                    every new application assembles these pieces separately, the cost of maintaining
                                    them can erase the speed gained during development.
                                </Text>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    LongLink provides a shared foundation for that work. Teams build the part that is
                                    specific to their process as a conventional Python application. LongLink provides
                                    the common infrastructure needed to deploy and operate it.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={4}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    Build around the process
                                </Heading>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    Business processes rarely fit a standard template. They have their own roles, data,
                                    approval paths, integrations, and exceptions. Workarounds spread across
                                    spreadsheets, email, scripts, and disconnected applications can make it difficult to
                                    see how the work actually happens.
                                </Text>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    With LongLink, developers can express those requirements directly in code. We call
                                    each application a <Text weight="semibold">Solution</Text>: a Python project for a
                                    specific process, with its own logic, routes, data models, and tests. Its source
                                    lives in a repository, where changes can be reviewed and versioned using familiar
                                    development tools.
                                </Text>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    Business users define and validate how the work should happen. Developers implement
                                    it. LongLink handles the common layer around the application.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={4}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    Keep it understandable as it changes
                                </Heading>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    AI can help teams create software more quickly, but speed at the start does not
                                    guarantee a system will be easy to change later. Processes evolve. Rules change.
                                    Someone needs to understand why an application behaves as it does and make a safe
                                    update.
                                </Text>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    That is why LongLink keeps the application in standard Python rather than hiding its
                                    behavior inside a proprietary workflow. Teams can inspect the code, test changes,
                                    review decisions, and adapt the Solution as requirements evolve. The goal is
                                    software that fits the work and remains practical to maintain.
                                </Text>
                            </Stack>

                            <Stack as="section" gap={4}>
                                <Heading level={2} textWrap="balance" type="display-3">
                                    How LongLink works
                                </Heading>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    A Solution runs as a separate FastAPI service. The LongLink Platform provides the
                                    surrounding operating layer, including access control, deployment, database and file
                                    storage, routing, and visibility into status and logs. The SDK connects the
                                    application to those capabilities when it needs them.
                                </Text>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    This separation gives each side a clear responsibility: the Solution defines what
                                    the process does; the Platform provides a consistent way to run it. Teams can build
                                    applications for different needs without rebuilding the same infrastructure each
                                    time.
                                </Text>
                                <Text as="p" className="leading-relaxed" textWrap="pretty">
                                    LongLink is open source and its public beta is live. If you want to see the model in
                                    practice,{' '}
                                    <Link href="https://www.longlink.dev/docs/sdk/" hasUnderline type="inherit">
                                        create a Solution with the documentation
                                    </Link>{' '}
                                    or{' '}
                                    <Link
                                        href="https://github.com/xLongLink/longlink"
                                        hasUnderline
                                        isExternalLink
                                        type="inherit"
                                    >
                                        explore the repository
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
                                <Text type="supporting">Last updated: September 25, 2026</Text>
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
