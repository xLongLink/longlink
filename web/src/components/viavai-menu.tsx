import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    ChevronDown,
    ChevronUp,
    CreditCard,
    FileCheck2,
    Shield,
} from 'lucide-react';

type ViaVaiSubMenuItem = {
    id: string;
    label: string;
};

type ViaVaiMenuItem = {
    id: string;
    label: string;
    icon: LucideIcon;
    children?: ViaVaiSubMenuItem[];
};

const menuItems: ViaVaiMenuItem[] = [
    {
        id: 'general',
        label: 'General',
        icon: Shield,
    },
    {
        id: 'billing',
        label: 'Billing and licensing',
        icon: CreditCard,
        children: [
            { id: 'overview', label: 'Overview' },
            { id: 'usage', label: 'Usage' },
            { id: 'budgets', label: 'Budgets and alerts' },
            { id: 'licensing', label: 'Licensing' },
            { id: 'payment-info', label: 'Payment information' },
        ],
    },
    {
        id: 'policies',
        label: 'Policies',
        icon: FileCheck2,
    },
];

const sectionTitle: Record<string, string> = {
    general: 'General settings',
    billing: 'Billing and licensing',
    policies: 'Policies',
    overview: 'Billing overview',
    usage: 'Usage',
    budgets: 'Budgets and alerts',
    licensing: 'Licensing',
    'payment-info': 'Payment information',
};

const sectionSubtitle: Record<string, string> = {
    general: 'Configure base preferences for your ViaVai app.',
    billing: 'Track your plan, payments, and billing controls.',
    policies: 'Manage compliance and governance policies.',
    overview: 'Get a quick summary of your current billing status.',
    usage: 'Monitor app usage and seats consumed over time.',
    budgets: 'Set spend limits and alert thresholds.',
    licensing: 'Review seats, terms, and license assignments.',
    'payment-info': 'Keep your billing details and payment methods up to date.',
};

export function ViaVaiMenu() {
    const [openSection, setOpenSection] = useState<string>('billing');
    const [activeSection, setActiveSection] = useState<string>('overview');

    const selectedTopLevel = useMemo(() => {
        return (
            menuItems.find((item) =>
                item.children?.some((child) => child.id === activeSection)
            )?.id ?? activeSection
        );
    }, [activeSection]);

    return (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const hasChildren = Boolean(item.children?.length);
                    const isOpen = openSection === item.id;
                    const isActive = selectedTopLevel === item.id;

                    return (
                        <div key={item.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (hasChildren) {
                                        setOpenSection((prev) =>
                                            prev === item.id ? '' : item.id
                                        );
                                        return;
                                    }
                                    setActiveSection(item.id);
                                }}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgba(255,255,255,0.75)]'
                                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Icon
                                    className={`h-4 w-4 ${isActive ? 'text-white' : 'text-white/70'}`}
                                />
                                <span className="flex-1">{item.label}</span>
                                {hasChildren &&
                                    (isOpen ? (
                                        <ChevronUp className="h-4 w-4 text-white/60" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-white/60" />
                                    ))}
                            </button>

                            {hasChildren && isOpen && (
                                <div className="mt-1 space-y-1 pl-7">
                                    {item.children?.map((subItem) => {
                                        const isSubActive =
                                            activeSection === subItem.id;
                                        return (
                                            <button
                                                key={subItem.id}
                                                type="button"
                                                onClick={() =>
                                                    setActiveSection(subItem.id)
                                                }
                                                className={`flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm transition ${
                                                    isSubActive
                                                        ? 'text-white'
                                                        : 'text-white/70 hover:text-white'
                                                }`}
                                            >
                                                {subItem.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </aside>

            <section className="space-y-2">
                <h2 className="text-2xl font-semibold">
                    {sectionTitle[activeSection]}
                </h2>
                <p className="max-w-xl text-sm text-white/60">
                    {sectionSubtitle[activeSection]}
                </p>
            </section>
        </div>
    );
}
