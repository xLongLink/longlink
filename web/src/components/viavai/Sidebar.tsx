import { useMemo, useState } from 'react';
import { type LucideIcon, Bell, Palette, UserRound } from 'lucide-react';
import {
    type SidebarSchemaConfig,
    type SidebarItem,
} from '@/types/viavai/sidebar.types';

const iconRegistry: Record<string, LucideIcon> = {
    profile: UserRound,
    appearance: Palette,
    notifications: Bell,
};

type SidebarProps = {
    schema: SidebarSchemaConfig;
    activeItem?: string;
};

function SidebarRow({
    item,
    active,
    onClick,
}: {
    item: SidebarItem;
    active: boolean;
    onClick: () => void;
}) {
    const Icon = iconRegistry[item.icon.toLowerCase()] ?? Bell;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                active
                    ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgba(255,255,255,0.75)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
        >
            <Icon
                className={`h-4 w-4 ${active ? 'text-white' : 'text-white/70'}`}
            />
            <span>{item.name}</span>
        </button>
    );
}

export function Sidebar({ schema, activeItem }: SidebarProps) {
    const fallbackActive = schema.items.at(0)?.name ?? '';
    const [selectedName, setSelectedName] = useState(
        activeItem ?? fallbackActive
    );

    const selectedItem = useMemo(() => {
        return (
            schema.items.find((item) => item.name === selectedName) ??
            schema.items.at(0)
        );
    }, [schema.items, selectedName]);

    return (
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            <aside className="w-full space-y-5 rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                {schema.title ? (
                    <h2 className="px-2 text-sm font-semibold tracking-tight text-white">
                        {schema.title}
                    </h2>
                ) : null}

                <div className="space-y-1">
                    {schema.items.map((item) => (
                        <SidebarRow
                            key={item.name}
                            item={item}
                            active={item.name === selectedName}
                            onClick={() => setSelectedName(item.name)}
                        />
                    ))}
                </div>
            </aside>

            <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
                {selectedItem?.element}
            </section>
        </div>
    );
}

export default Sidebar;
