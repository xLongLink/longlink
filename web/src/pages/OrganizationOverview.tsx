import { Plus } from 'lucide-react';

export function OrganizationOverview() {
    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Overview</h1>
                        <p className="mt-2 text-sm text-white/65">
                            Track the operating system for your organization
                            across projects, policy, and compliance readiness.
                        </p>
                    </div>
                    <button className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
                        <Plus className="h-4 w-4" />
                        New Initiative
                    </button>
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                {[
                    {
                        title: 'Portfolio readiness',
                        detail: '3 active workstreams · 2 pending approvals',
                    },
                    {
                        title: 'Compliance signals',
                        detail: 'SOC 2 evidence collection on track',
                    },
                    {
                        title: 'Operational cadence',
                        detail: 'Weekly governance review scheduled',
                    },
                    {
                        title: 'Automation coverage',
                        detail: '12 workflows running via agents',
                    },
                ].map((item) => (
                    <div
                        key={item.title}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"
                    >
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-2 text-xs text-white/60">
                            {item.detail}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default OrganizationOverview;
