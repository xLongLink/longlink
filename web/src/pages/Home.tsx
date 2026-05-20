import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { buttonVariants } from '@ui/button';
import { ArrowRight } from 'lucide-react';

/** Renders the public home page. */
export default function Home() {
    return (
        <div className="page-shell min-h-screen text-white">
            <Navbar />
            <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-[1000px] items-center px-6 py-16">
                <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <section className="space-y-8">
                        <div className="space-y-4">
                            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                                One workspace for apps, metadata, and access.
                            </h1>
                            <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                Sign in to open your organization, browse app pages, and manage the shared LongLink
                                runtime.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <a href="/auth/login/oidc" className={buttonVariants({ size: 'lg' })}>
                                Sign in with OIDC
                                <ArrowRight className="h-4 w-4" />
                            </a>
                            <a
                                href="https://docs.longlink.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: 'outline', size: 'lg' })}
                            >
                                Read the docs
                            </a>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
