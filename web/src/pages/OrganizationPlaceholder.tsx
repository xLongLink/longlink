import { Plus, Sparkles } from 'lucide-react';

export function OrganizationPlaceholder({ title }: { title: string }) {
    const lowerTitle = title.toLowerCase();

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            {title}
                        </h1>
                        <p className="text-sm text-white/60">
                            0 {lowerTitle} published
                        </p>
                    </div>
                </div>
                <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10">
                    <Plus className="h-4 w-4" />
                    Add {title}
                </button>
            </div>

            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                    <Sparkles className="h-7 w-7" />
                </div>
                <h2 className="mt-6 text-lg font-semibold">
                    No {lowerTitle} yet
                </h2>
                <p className="mt-2 text-sm text-white/60">
                    Share updates and announcements with your audience.
                </p>
                <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
                    <Plus className="h-4 w-4" />
                    Add {title}
                </button>
            </div>
        </div>
    );
}

export default OrganizationPlaceholder;
