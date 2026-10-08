import { Seo } from '@/components/Seo';
import type { ReactNode } from 'react';
import { Globe } from '@/components/Globe';
import { siteName, siteUrl } from '@/site';
import { OpenAI } from '@/components/OpenAI';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { ClaudeAI } from '@/components/ClaudeAI';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { ArrowRight, Code2, Minimize2, ServerCog, ShieldCheck, Split } from 'lucide-react';

const homeDescription =
    'LongLink is the open-source foundation for building, deploying, and operating dedicated business software in Python.';

// Use the same default prompt for both AI providers.
const aiPrompt = encodeURIComponent(
    'Read https://longlink.dev. Explain what LongLink is, its technology choices, the benefits of defining business processes as code, and some practical examples of what I can build with it.'
);

/** Renders a platform capability card. */
function CapabilityCard({ title, description, icon }: { title: string; description: ReactNode; icon: typeof Code2 }) {
    return (
        <Card className="-mb-px -mr-px rounded-none bg-transparent" minHeight={240} padding={6}>
            <Stack height="100%" justify="between">
                <Icon color="tertiary" icon={icon} size="lg" />
                <Stack gap={3}>
                    <Heading className="font-(family-name:--font-family-handwritten) tracking-wide uppercase" level={2}>
                        {title}
                    </Heading>
                    <Text as="p" color="secondary" textWrap="pretty">
                        {description}
                    </Text>
                </Stack>
            </Stack>
        </Card>
    );
}

/** Renders the public home page. */
export default function Home() {
    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                name: siteName,
                url: siteUrl,
                sameAs: ['https://github.com/xLongLink/longlink', 'https://www.linkedin.com/company/longlink'],
            },
            {
                '@type': 'WebSite',
                name: siteName,
                url: siteUrl,
                description: homeDescription,
            },
        ],
    };

    return (
        <>
            <Seo
                description={homeDescription}
                structuredData={structuredData}
                title="LongLink | Build and Operate business solutions"
            />
            <Stack className="relative -mt-21 overflow-clip">
                <main className="relative flex min-h-screen items-center justify-center px-6 pb-10 pt-28">
                    <Stack aria-hidden="true" className="absolute inset-0 overflow-visible bg-body">
                        <Globe />
                    </Stack>
                    <section className="relative z-10 mx-auto flex w-full max-w-5xl -translate-y-16 flex-col items-center text-center sm:-translate-y-24">
                        <Stack gap={2} hAlign="center">
                            <Text
                                as="p"
                                className="text-yellow-vivid"
                                justify="center"
                                textWrap="balance"
                                type="supporting"
                            >
                                Currently in testing Beta.{' '}
                                <Link
                                    as="a"
                                    color="inherit"
                                    href="https://github.com/xLongLink/longlink"
                                    hasUnderline
                                    isExternalLink
                                    type="inherit"
                                >
                                    Star LongLink on GitHub.
                                </Link>
                            </Text>
                            <Heading
                                className="flex flex-wrap items-center justify-center gap-2 font-(family-name:--font-family-handwritten) text-3xl tracking-wide uppercase sm:text-5xl"
                                justify="center"
                                level={1}
                                textWrap="balance"
                                type="display-2"
                            >
                                <Text hasCapsize type="inherit">
                                    Design
                                </Text>
                                <ArrowRight aria-hidden="true" className="size-6 shrink-0 sm:size-8" />
                                <Text hasCapsize type="inherit">
                                    Build
                                </Text>
                                <ArrowRight aria-hidden="true" className="size-6 shrink-0 sm:size-8" />
                                <Text hasCapsize type="inherit">
                                    Operate
                                </Text>
                                <ArrowRight aria-hidden="true" className="size-6 shrink-0 sm:size-8" />
                                <Text hasCapsize type="inherit">
                                    Improve
                                </Text>
                            </Heading>
                            <Text as="p" className="pt-1 text-lg sm:text-2xl" color="secondary" textWrap="pretty">
                                <Text display="block" type="inherit">
                                    The complete business process lifecycle, defined as code
                                </Text>
                                <Text display="block" type="inherit">
                                    One source of truth for how work gets done
                                </Text>
                            </Text>
                            <Stack direction="horizontal" gap={3} hAlign="center" paddingBlockStart={1} wrap="wrap">
                                <Button
                                    className="w-44"
                                    href={`https://chatgpt.com/?q=${aiPrompt}`}
                                    icon={<OpenAI aria-hidden="true" className="size-5 scale-125" focusable="false" />}
                                    label="What is LongLink"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                    variant="secondary"
                                />
                                <Button
                                    className="w-44"
                                    href={`https://claude.ai/new?q=${aiPrompt}`}
                                    icon={<ClaudeAI aria-hidden="true" className="size-5" focusable="false" />}
                                    label="What can I build"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                    variant="secondary"
                                />
                            </Stack>
                        </Stack>
                    </section>
                </main>
                <Section
                    aria-hidden="true"
                    className="homepage-integration-section relative z-10 min-h-48 sm:min-h-64"
                    padding={6}
                    paddingBlock={10}
                    variant="transparent"
                />
            </Stack>
            <Section className="relative z-20 bg-body" variant="transparent" padding={6} paddingBlock={6}>
                <Grid className="mx-auto" columns={{ minWidth: 320, max: 2 }} gap={0} maxWidth={1000}>
                    <CapabilityCard
                        description="Complete solutions using python and your favorite developer tools"
                        icon={Code2}
                        title="Build"
                    />
                    <CapabilityCard
                        description={
                            <>
                                All your solutions in one place,
                                <br />
                                with clear boundaries and a complete overview
                            </>
                        }
                        icon={ServerCog}
                        title="Operate"
                    />
                </Grid>
                <Grid className="mx-auto" columns={{ minWidth: 240, max: 3 }} gap={0} maxWidth={1000}>
                    <CapabilityCard
                        description="Processes are clear, easy to operate, and cheap to maintain"
                        icon={Minimize2}
                        title="Keep it Simple"
                    />
                    <CapabilityCard
                        description="Full transparency over the process and its data"
                        icon={ShieldCheck}
                        title="Own the Process"
                    />
                    <CapabilityCard
                        description="Clear distinction between a human decision and a machine task"
                        icon={Split}
                        title="Clear Boundaries"
                    />
                </Grid>
            </Section>
            <Section className="relative z-20 bg-body" padding={6} paddingBlock={10} variant="transparent">
                <Stack
                    className="mx-auto text-center"
                    gap={6}
                    hAlign="center"
                    maxWidth={1000}
                    paddingBlock={8}
                    width="100%"
                >
                    <Text aria-hidden="true" className="text-xl leading-none">
                        🇨🇭
                    </Text>
                    <Heading
                        className="font-(family-name:--font-family-handwritten) tracking-wide uppercase"
                        level={2}
                        textWrap="balance"
                        justify="center"
                    >
                        Made in Switzerland
                    </Heading>
                    <Grid columns={2} gap={3}>
                        <Button
                            className="w-full"
                            endContent={<ArrowRight aria-hidden="true" size={16} />}
                            href="/docs/introduction/"
                            label="Why LongLink"
                            variant="secondary"
                        />
                        <Button
                            className="w-full"
                            endContent={<ArrowRight aria-hidden="true" size={16} />}
                            href="/login/"
                            label="Get Started"
                            variant="primary"
                        />
                    </Grid>
                </Stack>
            </Section>
        </>
    );
}
