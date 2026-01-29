import {
  ArrowRight,
  Box,
  Briefcase,
  FolderKanban,
  Layers,
  Lock,
  Plug,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const featureCards = [
  {
    title: "Multi-Tenant Organizations",
    description:
      "Structure work across portfolios, business units, and compliance boundaries.",
    icon: FolderKanban,
  },
  {
    title: "Modular App System",
    description:
      "Install only the capabilities you need—from projects to audit workflows.",
    icon: Box,
  },
  {
    title: "Developer-First",
    description:
      "Ship faster with Git-native workflows and programmable automations.",
    icon: Zap,
  },
  {
    title: "Secure by Default",
    description:
      "Enterprise-grade controls for sensitive data, identity, and policy.",
    icon: ShieldCheck,
  },
  {
    title: "Team Collaboration",
    description:
      "Keep delivery teams aligned with shared workspaces and live updates.",
    icon: Users,
  },
  {
    title: "Extensible Platform",
    description:
      "Build custom modules or use pre-built apps for every operational need.",
    icon: Plug,
  },
];

const modules = [
  { title: "Issues", description: "Track bugs, risks, and operational tasks." },
  { title: "Docs", description: "Team documentation and governance policies." },
  { title: "Secrets", description: "Secure credentials with audit trails." },
  { title: "Compliance", description: "Evidence collection and reporting." },
  { title: "Agents", description: "AI automation for routine workflows." },
];

export function App() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_rgba(11,15,20,0.85)_55%)]" />
      <div className="relative">
        <header className="border-b border-white/10">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-wide">ViaVai</span>
            </div>
            <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
              <a className="transition hover:text-white" href="#overview">
                Overview
              </a>
              <a className="transition hover:text-white" href="#projects">
                Projects
              </a>
              <a className="transition hover:text-white" href="#offerings">
                Offerings
              </a>
              <a className="transition hover:text-white" href="#careers">
                Careers
              </a>
            </nav>
            <button className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
              Login
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16">
          <section className="text-center" id="overview">
            <div className="mx-auto max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                A unified operating system for organizations
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                The modular platform
                <span className="text-blue-400"> built for modern teams</span>
              </h1>
              <p className="mt-5 text-base text-white/70 md:text-lg">
                Combine Git-centric versioning, portfolio management, compliance,
                and internal tools into one secure workspace. Ship faster with a
                platform that adapts to every operational workflow.
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

          <section className="mt-14 grid gap-6 md:grid-cols-3" id="projects">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>
                  <p className="mt-3 text-sm text-white/65">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </section>

          <section className="mt-20 text-center" id="offerings">
            <h2 className="text-3xl font-semibold">Install apps as you grow</h2>
            <p className="mt-3 text-sm text-white/65">
              Start minimal and extend your workspace with pre-built modules or
              custom apps.
            </p>
            <div className="mt-10 grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-left md:grid-cols-[1.1fr_1fr]">
              <div>
                <div className="flex items-center gap-3 text-lg font-semibold">
                  <Briefcase className="h-5 w-5 text-blue-400" />
                  Available Modules
                </div>
                <div className="mt-6 space-y-4">
                  {modules.map((module) => (
                    <div key={module.title} className="flex gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full border border-blue-500/40 bg-blue-500/20" />
                      <div>
                        <p className="text-sm font-semibold">
                          {module.title}
                        </p>
                        <p className="text-xs text-white/60">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800/60 p-6">
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
            </div>
          </section>

          <section className="mt-20" id="careers">
            <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950 via-blue-900/50 to-slate-900 px-8 py-10 text-center">
              <h2 className="text-3xl font-semibold">
                Ready to get started?
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Join teams building better with ViaVai&apos;s unified platform.
              </p>
              <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
                Start Building Now
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-white/60 md:flex-row">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-400" />
              © 2024 ViaVai. All rights reserved.
            </div>
            <div className="flex gap-6">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Documentation</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
