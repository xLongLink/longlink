import { FolderKanban, Plus } from 'lucide-react';

export function OrganizationProjects() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Projects</h1>
                    <p className="mt-2 text-sm text-white/65">
                        Keep delivery teams aligned with live initiatives and
                        governance requirements.
                    </p>
                </div>
                <button className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
                    <Plus className="h-4 w-4" />
                    New Project
                </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                {[
                    {
                        title: 'Policy Automation',
                        detail: 'Audit workflows, control mapping, and reporting.',
                        meta: 'Compliance · 4 teams',
                    },
                    {
                        title: 'Portfolio Sync',
                        detail: 'Align initiatives across business units and services.',
                        meta: 'Strategy · 2 teams',
                    },
                    {
                        title: 'Internal Tools Hub',
                        detail: 'Unified HR, finance, and knowledge operations.',
                        meta: 'Operations · 3 teams',
                    },
                    {
                        title: 'Deployment Governance',
                        detail: 'Release orchestration for multi-region rollouts.',
                        meta: 'Ops · 5 teams',
                    },
                ].map((project) => (
                    <div
                        key={project.title}
                        className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                                <FolderKanban className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold">
                                    {project.title}
                                </h3>
                                <p className="text-xs text-white/55">
                                    {project.meta}
                                </p>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-white/70">
                            {project.detail}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default OrganizationProjects;
