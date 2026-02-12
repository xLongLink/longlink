import { Code2 } from 'lucide-react';
import { useState } from 'react';

const sectionTitle = {
    general: 'General developer settings',
} as const;

const sectionSubtitle = {
    general: 'Manage API access, webhooks, and tooling defaults',
} as const;

type SectionId = keyof typeof sectionTitle;

const menuItems: Array<{ id: SectionId; label: string; icon: typeof Code2 }> = [
    { id: 'general', label: 'General', icon: Code2 },
];

export default function Developer() {
    const [activeSection, setActiveSection] = useState<SectionId>('general');

    return (
        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="space-y-6">
                <div className="space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => setActiveSection(item.id)}
                                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgba(255,255,255,0.75)]'
                                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4 text-white/70" />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </aside>

            <section className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">
                        {sectionTitle[activeSection]}
                    </h2>
                    <p className="text-sm text-white/60">
                        {sectionSubtitle[activeSection]}
                    </p>
                </div>
            </section>
        </div>
    );
}
