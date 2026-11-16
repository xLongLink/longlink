import { Page } from '@/components/ui/page';
import { ArrowRight, Mail } from 'lucide-react';
import { Docker } from '@/components/svg/docker';
import { Python } from '@/components/svg/python';
import { Fastapi } from '@/components/svg/fastapi';
import { ReactDark } from '@/components/svg/react-dark';
import { Foundation } from '@/components/ui/foundation';
import { Grid } from '@/components/longlink/layout/grid';
import { Kubernetes } from '@/components/svg/kubernetes';
import { Postgresql } from '@/components/svg/postgresql';
import { Typescript } from '@/components/svg/typescript';
import { Tailwindcss } from '@/components/svg/tailwindcss';
import { NativeLink as Link } from '@/components/custom/native-link';
import { buttonVariants } from '@/components/longlink/action/button';
import { NativeNavigationLink } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';

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
                            <h1 className="font-semibold text-balance text-start text-4xl tracking-tight text-white sm:text-6xl">
                                Your business.
                                <br />
                                Defined as code.
                            </h1>
                            <p className="text-pretty max-w-md text-lg text-white/80 sm:text-xl">
                                Design, build, operate, and improve.
                                <br />
                                One source of truth for how work gets done.
                            </p>
                            <p className="text-xs text-white/80">
                                Currently in testing Beta.{' '}
                                <Link
                                    href="https://github.com/xLongLink/longlink"
                                    isExternalLink
                                    className="underline text-inherit"
                                >
                                    Star LongLink on GitHub.
                                </Link>
                            </p>
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
                        <p className="text-muted-foreground text-pretty max-w-3xl text-center text-xl sm:text-2xl">
                            Think about how easy it is to find a book in a library.
                            <br />
                            We create the tools you need to organize and validate your data, documents, and processes.
                        </p>
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
                            <span aria-hidden="true" className="text-xl leading-none">
                                🇨🇭
                            </span>
                            <Stack gap={0} align="center">
                                <h2 className="font-semibold text-3xl text-balance text-center tracking-wide">
                                    Made in Switzerland
                                </h2>
                                <p className="text-muted-foreground text-balance">Using open-source technologies</p>
                            </Stack>
                            <Grid columns={2} gap={3}>
                                <NativeNavigationLink
                                    className={buttonVariants({ variant: 'outline', className: 'w-full' })}
                                    href="mailto:info@longlink.dev"
                                >
                                    Contact Us
                                    <Mail aria-hidden="true" size={16} />
                                </NativeNavigationLink>
                                <NativeNavigationLink
                                    className={buttonVariants({ className: 'w-full' })}
                                    href="/login/"
                                >
                                    Get Started
                                    <ArrowRight aria-hidden="true" size={16} />
                                </NativeNavigationLink>
                            </Grid>
                        </Stack>
                    </div>
                </section>
            </Stack>
        </Page>
    );
}
