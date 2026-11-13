import { Page } from '@/components/Page';
import { Grid } from '@/components/ui/Grid';
import { ArrowRight, Mail } from 'lucide-react';
import { Docker } from '@/components/svg/Docker';
import { Python } from '@/components/svg/Python';
import { Fastapi } from '@/components/svg/Fastapi';
import { Foundation } from '@/components/Foundation';
import { ReactDark } from '@/components/svg/ReactDark';
import { Kubernetes } from '@/components/svg/Kubernetes';
import { Postgresql } from '@/components/svg/Postgresql';
import { Typescript } from '@/components/svg/Typescript';
import { Tailwindcss } from '@/components/svg/Tailwindcss';
import { NativeLink as Link } from '@/components/ui/NativeLink';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeButton as Button } from '@/components/ui/NativeButton';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';

const homeDescription =
    'LongLink is the open-source foundation for building, deploying, and operating dedicated business software in Python.';

const technologies = [
    { name: 'Python', logo: Python, position: 'top-6 left-2 sm:top-16 sm:left-10' },
    { name: 'FastAPI', logo: Fastapi, position: 'top-6 right-2 sm:top-10 sm:right-16' },
    { name: 'React', logo: ReactDark, position: 'bottom-6 left-2 sm:bottom-12 sm:left-20' },
    { name: 'PostgreSQL', logo: Postgresql, position: 'right-2 bottom-6 sm:right-10 sm:bottom-16' },
    { name: 'Docker', logo: Docker, position: 'top-6 left-1/3 sm:top-0 sm:left-1/4' },
    { name: 'Kubernetes', logo: Kubernetes, position: 'top-6 right-1/3 sm:top-0 sm:right-1/4' },
    { name: 'TypeScript', logo: Typescript, position: 'bottom-6 left-1/3 sm:bottom-0 sm:left-1/3' },
    { name: 'Tailwind CSS', logo: Tailwindcss, position: 'right-1/3 bottom-6 sm:right-1/4 sm:bottom-0' }
];

/** Renders the public home page. */
export default function Home() {
    return (
        <Page description={homeDescription} title="LongLink | Build and Operate business solutions">
            <Stack as="main">
                <section className="relative isolate flex flex-col overflow-hidden">
                    <img
                        alt=""
                        className="absolute inset-0 size-full -scale-x-100 bg-black object-cover"
                        fetchPriority="high"
                        height={941}
                        src="/images/landing-earth.png"
                        width={1672}
                    />
                    <Stack
                        className="relative flex-1 bg-linear-to-t from-black via-black/50 to-transparent p-6 sm:p-10"
                        align="start"
                        justify="end"
                        minHeight="100svh"
                    >
                        <Stack className="max-w-xl text-left" gap={6} align="start">
                            <Heading
                                className="text-4xl tracking-tight text-white sm:text-6xl"
                                justify="start"
                                level={1}
                                textWrap="balance"
                                type="display-2"
                            >
                                Your business.
                                <br />
                                Defined as code.
                            </Heading>
                            <Text as="p" className="max-w-md text-lg text-white/80 sm:text-xl" textWrap="pretty">
                                Design, build, operate, and improve.
                                <br />
                                One source of truth for how work gets done.
                            </Text>
                            <Text as="p" className="text-white/80" type="supporting">
                                Currently in testing Beta.{' '}
                                <Link
                                    color="inherit"
                                    href="https://github.com/xLongLink/longlink"
                                    hasUnderline
                                    isExternalLink
                                    type="inherit"
                                >
                                    Star LongLink on GitHub.
                                </Link>
                            </Text>
                        </Stack>
                    </Stack>
                </section>
                <Foundation />
                <section className="px-6 py-10">
                    <Stack className="mx-auto" maxWidth={1200} gap={8} align="center">
                        <img
                            alt="An architectural drawing of an orderly library with connected workspaces and sweeping staircases."
                            className="aspect-2/1 w-full object-cover sm:aspect-5/2"
                            height={941}
                            loading="lazy"
                            src="/images/organized-work.webp"
                            width={1672}
                        />
                        <Text
                            as="p"
                            className="max-w-3xl text-center text-xl sm:text-2xl"
                            color="secondary"
                            textWrap="pretty"
                            type="large"
                        >
                            Think about how easy it is to find a book in a library.
                            <br />
                            We create the tools you need to organize and validate your data, documents, and processes.
                        </Text>
                    </Stack>
                </section>
                <section className="py-16 sm:py-24">
                    <div className="px-6 py-3">
                        <Stack
                            className="relative mx-auto py-32 text-center sm:py-40"
                            gap={6}
                            align="center"
                            maxWidth={1000}
                            width="100%"
                        >
                            {technologies.map((technology) => (
                                <technology.logo
                                    key={technology.name}
                                    aria-label={technology.name}
                                    role="img"
                                    className={`absolute size-10 opacity-80 motion-safe:technology-float sm:size-14 ${technology.position}`}
                                    height={56}
                                    width={56}
                                />
                            ))}
                            <Text aria-hidden="true" className="text-xl leading-none">
                                🇨🇭
                            </Text>
                            <Stack gap={0} align="center">
                                <Heading className="tracking-wide" level={2} textWrap="balance" justify="center">
                                    Made in Switzerland
                                </Heading>
                                <Text as="p" color="secondary" textWrap="balance">
                                    Using open-source technologies
                                </Text>
                            </Stack>
                            <Grid columns={2} gap={3}>
                                <Button
                                    className="w-full"
                                    endContent={<Mail aria-hidden="true" size={16} />}
                                    href="mailto:info@longlink.dev"
                                    label="Contact Us"
                                    variant="outline"
                                />
                                <Button
                                    className="w-full"
                                    endContent={<ArrowRight aria-hidden="true" size={16} />}
                                    href="/login/"
                                    label="Get Started"
                                    variant="default"
                                />
                            </Grid>
                        </Stack>
                    </div>
                </section>
            </Stack>
        </Page>
    );
}
