import {
    ArrowRight,
    Box,
    Briefcase,
    FolderKanban,
    Layers,
    Plug,
    ShieldCheck,
    Sparkles,
    Users,
    Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';

export default function Home() {
    const navigate = useNavigate();
    const { user } = useUser();

    const loginLabel = user ? 'Access' : 'Login';
    const loginTarget = user ? '/organizations' : '/login';

    return (
        <div className="min-h-screen text-white">
            <div className="relative">
                <div className="flex min-h-[1080px] flex-col">
                    <header className="border-b border-white/10">
                        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <span className="text-lg font-semibold tracking-wide">
                                    ViaVai
                                </span>
                            </div>
                            <Button
                                className="flex items-center gap-2 bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-500"
                                onClick={() => navigate(loginTarget)}
                            >
                                {loginLabel}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </header>

                    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-16">
                        <section className="text-center" id="overview">
                            <div className="mx-auto max-w-3xl">
                                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/70">
                                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                                    A unified operating system for organizations
                                </p>
                                <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                                    The modular platform
                                    <span className="text-blue-400">
                                        {' '}
                                        built for modern teams
                                    </span>
                                </h1>
                                <p className="mt-5 text-base text-white/70 md:text-lg">
                                    Combine Git-centric versioning, portfolio
                                    management, compliance, and internal tools
                                    into one secure workspace. Ship faster with
                                    a platform that adapts to every operational
                                    workflow.
                                </p>
                                <div className="mt-8 flex flex-wrap justify-center gap-4">
                                    <button className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
                                        Get Started
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <button className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white">
                                        Learn More
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section
                            className="mt-14 grid gap-6 md:grid-cols-3"
                            id="projects"
                        >
                            <Card>
                                <CardContent>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                                        <FolderKanban className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">
                                        Multi-Tenant Organizations
                                    </h3>
                                    <p className="mt-3 text-sm text-white/65">
                                        Structure work across portfolios,
                                        business units, and compliance
                                        boundaries.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                                        <Box className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">
                                        Modular App System
                                    </h3>
                                    <p className="mt-3 text-sm text-white/65">
                                        Install only the capabilities you
                                        need—from projects to audit workflows.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                                        <Zap className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">
                                        Developer-First
                                    </h3>
                                    <p className="mt-3 text-sm text-white/65">
                                        Ship faster with Git-native workflows
                                        and programmable automations.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">
                                        Secure by Default
                                    </h3>
                                    <p className="mt-3 text-sm text-white/65">
                                        Enterprise-grade controls for sensitive
                                        data, identity, and policy.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">
                                        Team Collaboration
                                    </h3>
                                    <p className="mt-3 text-sm text-white/65">
                                        Keep delivery teams aligned with shared
                                        workspaces and live updates.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                                        <Plug className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">
                                        Extensible Platform
                                    </h3>
                                    <p className="mt-3 text-sm text-white/65">
                                        Build custom modules or use pre-built
                                        apps for every operational need.
                                    </p>
                                </CardContent>
                            </Card>
                        </section>
                    </main>
                </div>

                <main className="mx-auto w-full max-w-6xl px-6 pb-20">
                    <section className="mt-20 text-center" id="offerings">
                        <h2 className="text-3xl font-semibold">
                            Install apps as you grow
                        </h2>
                        <p className="mt-3 text-sm text-white/65">
                            Start minimal and extend your workspace with
                            pre-built modules or custom apps.
                        </p>

                        <Card className="mt-10">
                            <CardContent className="grid gap-6 p-8 text-left md:grid-cols-[1.1fr_1fr]">
                                <div>
                                    <div className="flex items-center gap-3 text-lg font-semibold">
                                        <Briefcase className="h-5 w-5 text-blue-400" />
                                        Available Modules
                                    </div>
                                    <div className="mt-6 space-y-4">
                                        <div className="flex gap-3">
                                            <div className="mt-1 h-5 w-5 rounded-full border border-blue-500/40 bg-blue-500/20" />
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    Issues
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    Track bugs, risks, and
                                                    operational tasks.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="mt-1 h-5 w-5 rounded-full border border-blue-500/40 bg-blue-500/20" />
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    Docs
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    Team documentation and
                                                    governance policies.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="mt-1 h-5 w-5 rounded-full border border-blue-500/40 bg-blue-500/20" />
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    Secrets
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    Secure credentials with
                                                    audit trails.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="mt-1 h-5 w-5 rounded-full border border-blue-500/40 bg-blue-500/20" />
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    Compliance
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    Ensure adherence to
                                                    regulations and standards.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="mt-1 h-5 w-5 rounded-full border border-blue-500/40 bg-blue-500/20" />
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    Agents
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    AI automation for routine
                                                    workflows.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                                    <div className="space-y-3">
                                        <div className="h-2 w-full rounded-full bg-white/10">
                                            <div className="h-2 w-3/4 rounded-full bg-blue-500" />
                                        </div>
                                        <div className="h-2 w-4/5 rounded-full bg-white/10" />
                                        <div className="h-2 w-2/3 rounded-full bg-white/10" />
                                    </div>
                                    <div className="mt-8 grid grid-cols-2 gap-4">
                                        <div className="h-20 rounded-xl border border-white/10 bg-white/5" />
                                        <div className="h-20 rounded-xl border border-white/10 bg-white/5" />
                                        <div className="h-20 rounded-xl border border-blue-500/50 bg-blue-600/10" />
                                        <div className="h-20 rounded-xl border border-white/10 bg-white/5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="mt-20" id="careers">
                        <Card className="rounded-3xl border-white/10 bg-white/5">
                            <CardContent className="px-8 py-10 text-center">
                                <h2 className="text-3xl font-semibold">
                                    Ready to get started?
                                </h2>
                                <p className="mt-3 text-sm text-white/70">
                                    Join teams building better with
                                    ViaVai&apos;s unified platform.
                                </p>
                                <Button className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
                                    Start Building Now
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    </section>
                </main>

                <footer className="border-t border-white/10">
                    <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-white/60 md:flex-row">
                        <div className="flex items-center gap-2">
                            © 2026 LongLink SAGL. All rights reserved.
                        </div>
                        <div className="flex gap-6">
                            <Link to="/privacy" className="hover:text-white">
                                Privacy
                            </Link>
                            <Link to="/terms" className="hover:text-white">
                                Terms
                            </Link>
                            <Link to="/impressum" className="hover:text-white">
                                Impressum
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
