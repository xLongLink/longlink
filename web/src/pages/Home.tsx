import { useUser } from '@/hooks/use-user';
import LongLink from '@/pages/Longlink';
import { buttonVariants } from '@ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';

/** Renders the public home page for anonymous users. */
export default function Home() {
    const { data: user, isLoading } = useUser();

    if (isLoading) {
        return null;
    }

    if (user) {
        return <LongLink path="/api/user/metadata.json" />;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_38%),linear-gradient(180deg,_#020617_0%,_#020617_45%,_#0f172a_100%)] text-white">
            <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
                <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <section className="space-y-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur">
                            <Sparkles className="h-4 w-4 text-sky-300" />
                            Welcome to LongLink
                        </div>

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
                                className={buttonVariants({ variant: 'outline', size: 'lg' })}
                            >
                                Read the docs
                            </a>
                        </div>
                    </section>

                    <Card className="border-white/10 bg-white/5 backdrop-blur">
                        <CardHeader>
                            <CardDescription className="text-white/60">What you get after sign-in</CardDescription>
                            <CardTitle className="text-2xl text-white">A controlled app runtime</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-6">
                            <div className="flex gap-3 rounded-lg border border-white/10 bg-black/20 p-4">
                                <Lock className="mt-0.5 h-5 w-5 text-sky-300" />
                                <div>
                                    <p className="font-medium text-white">Protected access</p>
                                    <p className="text-sm text-white/60">
                                        Authentication gates control-plane pages and metadata-backed app routes.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/65">
                                After login, LongLink loads your organization shell and renders the configured XML
                                pages.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
