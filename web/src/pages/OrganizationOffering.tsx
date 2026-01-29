import { Box, Plus, Sparkles } from 'lucide-react';

export function OrganizationOffering() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                        <Box className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Products & Services
                        </h1>
                        <p className="mt-1 text-sm text-white/50">
                            0 active offerings
                        </p>
                    </div>
                </div>
                <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-white/25 hover:bg-white/10">
                    <Plus className="h-4 w-4" />
                    Add Offering
                </button>
            </div>
            <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/60 px-6 py-16 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300 shadow-[0_10px_30px_rgba(37,99,235,0.2)]">
                    <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">No offerings yet</h2>
                <p className="mt-2 text-sm text-white/60">
                    Showcase your products and services to potential customers
                </p>
                <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
                    <Plus className="h-4 w-4" />
                    Create First Offering
                </button>
            </div>
        </div>
    );
}

export default OrganizationOffering;
