import { Seo } from '@/components/Seo';
import type { ReactNode } from 'react';
import { Globe } from '@/components/Globe';
import { siteName, siteUrl } from '@/site';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { ArrowRight, Code2, Minimize2, ServerCog, ShieldCheck, Split } from 'lucide-react';

const homeDescription =
    'LongLink is the open-source foundation for building, deploying, and operating dedicated business software in Python.';

/** Renders a navigation card for one solution path. */
function PathCard({
    title,
    description,
    action,
    isComingSoon,
}: {
    title: string;
    description: ReactNode;
    action: string;
    isComingSoon: boolean;
}) {
    return (
        <Stack width="100%">
            <Stack aria-hidden={!isComingSoon} className={isComingSoon ? undefined : 'invisible'}>
                <Banner container="section" status="warning" title={<Text type="supporting">Coming Soon</Text>} />
            </Stack>
            <ClickableCard
                className="group min-h-80 rounded-none bg-transparent sm:min-h-96"
                href="/docs/"
                label={action}
                padding={6}
            >
                <Stack
                    aria-hidden="true"
                    className="absolute inset-0 origin-left scale-x-0 bg-muted transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100 motion-reduce:transition-none"
                />
                <Stack className="relative z-10" height="100%" gap={8} justify="between">
                    <Stack gap={4}>
                        <Heading
                            level={2}
                            type="display-1"
                            textWrap="nowrap"
                            className="text-6xl tracking-tighter sm:text-7xl"
                        >
                            {title}
                        </Heading>
                        <Text as="p" color="secondary" textWrap="pretty">
                            {description}
                        </Text>
                    </Stack>
                    <Stack
                        direction="horizontal"
                        hAlign="between"
                        vAlign="center"
                        width="100%"
                        className="whitespace-nowrap"
                    >
                        <Text weight="medium">{action}</Text>
                        <ArrowRight
                            aria-hidden="true"
                            className="size-4 transition-transform group-hover:translate-x-1 group-focus-within:translate-x-1 motion-reduce:transition-none"
                        />
                    </Stack>
                </Stack>
                <Stack
                    aria-hidden="true"
                    className="path-navigation-cue absolute inset-x-0 bottom-0 z-10 h-1 origin-left scale-x-0 bg-accent-bg opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                />
            </ClickableCard>
        </Stack>
    );
}

/** Renders a platform capability card. */
function CapabilityCard({ title, description, icon }: { title: string; description: string; icon: typeof Code2 }) {
    return (
        <Card className="-mb-px -mr-px rounded-none bg-transparent" minHeight={240} padding={6}>
            <Stack height="100%" justify="between">
                <Icon color="tertiary" icon={icon} size="lg" />
                <Stack gap={3}>
                    <Heading className="text-base" level={2}>
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
            <main className="relative -mt-21 flex min-h-screen overflow-x-clip items-center justify-center px-6 pb-10 pt-28">
                <Stack aria-hidden="true" className="absolute inset-0 overflow-visible bg-body">
                    <Globe />
                </Stack>
                <section className="relative z-10 mx-auto flex w-full max-w-5xl -translate-y-16 flex-col items-center text-center sm:-translate-y-24">
                    <Stack gap={5}>
                        <Heading
                            className="mx-auto max-w-4xl text-5xl uppercase lg:text-6xl"
                            justify="center"
                            level={1}
                            textWrap="balance"
                            type="display-1"
                            weight="semibold"
                        >
                            Build what you need
                        </Heading>
                        <Text
                            as="p"
                            className="mx-auto text-base leading-normal sm:text-xl"
                            color="secondary"
                            display="block"
                        >
                            <Text display="block" type="inherit">
                                The narrative has changed, but you are still buying the old story
                            </Text>
                            <Text className="tracking-[-0.012em]" display="block" type="inherit">
                                The economics have shifted; flexibility now lives in code
                            </Text>
                            <Text className="tracking-[0.026em]" display="block" type="inherit">
                                Build the solution, not the workaround
                            </Text>
                            <Text className="tracking-[0.026em]" display="block" type="inherit">
                                Start from solid foundations
                            </Text>
                            <Text display="block" type="inherit">
                                This is LongLink
                            </Text>
                        </Text>
                    </Stack>
                </section>
            </main>
            <Section
                aria-hidden="true"
                className="homepage-integration-section relative z-10 min-h-80 sm:min-h-96"
                padding={6}
                paddingBlock={10}
                variant="transparent"
            />
            <Section className="relative z-20 bg-body" variant="transparent" padding={6} paddingBlock={10}>
                <Grid className="mx-auto" columns={{ minWidth: 320, max: 2 }} gap={0} maxWidth={1000}>
                    <CapabilityCard
                        description="Build complete solutions using python and your favorite developer tools"
                        icon={Code2}
                        title="Build"
                    />
                    <CapabilityCard
                        description="We manage authentication, permissions, deployment, storage, routing, and logging"
                        icon={ServerCog}
                        title="Operate"
                    />
                </Grid>
                <Grid className="mx-auto" columns={{ minWidth: 240, max: 3 }} gap={0} maxWidth={1000}>
                    <CapabilityCard
                        description="Processes are clear, easy to operate, and cheap to maintain"
                        icon={Minimize2}
                        title="Keep it simple"
                    />
                    <CapabilityCard
                        description="Compliance, accountability and a solution that fit the needs"
                        icon={ShieldCheck}
                        title="Own the process"
                    />
                    <CapabilityCard
                        description="Clear distinction between a machine and a human task"
                        icon={Split}
                        title="Separate responsibilities"
                    />
                </Grid>
            </Section>
            <Section className="relative z-20 bg-body" padding={6} paddingBlock={10} variant="transparent">
                <Stack className="mx-auto py-16 text-center" gap={6} hAlign="center" maxWidth={1000} width="100%">
                    <Stack gap={2} hAlign="center">
                        <Heading justify="center" level={2} textWrap="balance" type="display-2">
                            Design
                            <ArrowRight
                                aria-hidden="true"
                                className="mx-2 inline-block size-6 align-middle sm:size-8"
                            />
                            Build
                            <ArrowRight
                                aria-hidden="true"
                                className="mx-2 inline-block size-6 align-middle sm:size-8"
                            />
                            Operate
                            <ArrowRight
                                aria-hidden="true"
                                className="mx-2 inline-block size-6 align-middle sm:size-8"
                            />
                            Improve
                        </Heading>
                        <Text as="p" color="secondary" textWrap="pretty">
                            <Text display="block" type="inherit">
                                The complete business process lifecycle, defined as code
                            </Text>
                            <Text display="block" type="inherit">
                                Designed to be inspected, reviewed and improved.
                            </Text>
                        </Text>
                    </Stack>
                </Stack>
            </Section>
            <Section className="relative z-20 bg-body" variant="transparent" padding={6} paddingBlock={10}>
                <Stack className="mx-auto" width="100%" maxWidth={1000} gap={8}>
                    <Grid columns={{ minWidth: 260, max: 3, repeat: 'fit' }}>
                        <PathCard
                            action="Explore existing solutions"
                            description={
                                <>
                                    an existing solutions as it is.
                                    <br />
                                    <br />
                                    Use a proven process without rebuilding what already exists.
                                </>
                            }
                            isComingSoon
                            title="Adopt"
                        />
                        <PathCard
                            action="Start from a foundation"
                            description={
                                <>
                                    and adapt an existing solution.
                                    <br />
                                    <br />
                                    Change its workflow, fields, rules, integrations, or interface around your
                                    requirements.
                                </>
                            }
                            isComingSoon
                            title="Branch"
                        />
                        <PathCard
                            action="Build a new solution"
                            description={
                                <>
                                    a unique solution.
                                    <br />
                                    <br />
                                    The process is uniquely yours. We handle the infrastructure; you own the solution.
                                </>
                            }
                            isComingSoon={false}
                            title="Create"
                        />
                    </Grid>
                </Stack>
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
                    <Heading level={2} textWrap="balance" type="display-2" justify="center">
                        Built and hosted in Switzerland.
                    </Heading>
                    <Stack className="flex-wrap" direction="horizontal" gap={3} hAlign="center" vAlign="center">
                        <Button
                            endContent={<ArrowRight aria-hidden="true" size={16} />}
                            href="/blog/introducing-longlink/"
                            label="Introducing LongLink"
                            variant="secondary"
                        />
                        <Button
                            endContent={<ArrowRight aria-hidden="true" size={16} />}
                            href="https://github.com/xLongLink/longlink"
                            label="Leave a star on GitHub"
                            rel="noopener noreferrer"
                            target="_blank"
                            variant="primary"
                        />
                    </Stack>
                </Stack>
            </Section>
        </>
    );
}
