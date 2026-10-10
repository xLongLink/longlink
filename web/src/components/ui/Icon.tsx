import { useQuery } from '@tanstack/react-query';
import type { IconName } from 'lucide-react/dynamic';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import { createContext, createElement, useContext, type ReactNode } from 'react';
import {
    X,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Boxes,
    Building2,
    Calendar,
    Check,
    CheckCheck,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clock,
    Columns,
    Copy,
    Database,
    ExternalLink,
    EyeOff,
    Filter,
    HardDrive,
    Info,
    Menu,
    Mic,
    MoreHorizontal,
    RefreshCw,
    ScrollText,
    Search,
    Square,
    Trash2,
    UserRound,
    Users,
    Wrench,
    XCircle,
    createLucideIcon,
    type LucideIcon,
    type LucideIconData,
} from 'lucide-react';

const stoneIconComponents = {
    close: X,
    chevronDown: ChevronDown,
    chevronLeft: ChevronLeft,
    chevronRight: ChevronRight,
    chevronsLeft: ChevronsLeft,
    chevronsRight: ChevronsRight,
    check: Check,
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
    calendar: Calendar,
    clock: Clock,
    externalLink: ExternalLink,
    menu: Menu,
    moreHorizontal: MoreHorizontal,
    refresh: RefreshCw,
    search: Search,
    arrowUp: ArrowUp,
    arrowDown: ArrowDown,
    arrowsUpDown: ArrowUpDown,
    boxes: Boxes,
    building2: Building2,
    database: Database,
    funnel: Filter,
    eyeSlash: EyeOff,
    viewColumns: Columns,
    copy: Copy,
    checkDouble: CheckCheck,
    wrench: Wrench,
    stop: Square,
    microphone: Mic,
    logs: ScrollText,
    trash: Trash2,
    hardDrive: HardDrive,
    userRound: UserRound,
    users: Users,
} satisfies Record<string, LucideIcon>;

export type StoneIconName = keyof typeof stoneIconComponents | IconName | `lucide:${IconName}`;

// Native pages and isolated Views supply separate loaders for the same public icon contract.
export const IconRequestContext = createContext<((name: string) => Promise<LucideIconData>) | null>(null);

// A blank Lucide glyph retains the requested Astryx dimensions while an icon loads.
const emptyIcon = createLucideIcon({ size: 24, node: [] });

// SAFETY: Every registry entry is created from the bundled component map without filtering keys.
export const stoneIconRegistry = Object.fromEntries(
    Object.entries(stoneIconComponents).map(([name, IconComponent]) => [
        name,
        createElement(IconComponent, { 'aria-hidden': true, size: '1em' }),
    ])
) as Record<keyof typeof stoneIconComponents, ReactNode>;

/** Renders any Lucide icon by its kebab-case name. Existing LongLink aliases remain immediate; other icons load on demand and are cached without blocking the View or changing icon dimensions. */
export function Icon({
    icon,
    size,
    hidden,
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    /** Lucide kebab-case name or LongLink alias. Prefix with lucide: to bypass an existing alias, such as lucide:logs. */
    icon: StoneIconName;
    size: 'sm' | 'md' | 'lg';
}) {
    // Resolve existing LongLink names synchronously without mounting a query or loading another chunk.
    if (Object.hasOwn(stoneIconComponents, icon)) {
        // SAFETY: The own-property check restricts the lookup to the bundled icon names.
        const component = stoneIconComponents[icon as keyof typeof stoneIconComponents];

        return <AstryxIcon icon={component} size={size} className={hidden ? 'hidden!' : undefined} />;
    }

    // Explicit Lucide names bypass legacy aliases but share the same on-demand cache.
    return <DeferredIcon icon={icon.startsWith('lucide:') ? icon.slice(7) : icon} size={size} hidden={hidden} />;
}

/** Caches on-demand glyphs without suspending the containing page or changing icon dimensions. */
function DeferredIcon({ icon, size, hidden }: { icon: string; size: 'sm' | 'md' | 'lg'; hidden?: boolean }) {
    const load = useContext(IconRequestContext);

    if (load === null) throw new Error('Icon requires IconRequestContext');

    // Share both in-flight work and rendered components for repeated uses of the same icon.
    const { data: component, isError } = useQuery({
        queryKey: ['icon', icon],
        queryFn: async () => {
            const data = await load(icon);

            return createLucideIcon(data);
        },
        staleTime: Infinity,
        gcTime: Infinity,
        retry: 1,
    });

    // Keep labeled controls usable even if an icon cannot be loaded.
    return (
        <AstryxIcon
            icon={component ?? (isError ? AlertTriangle : emptyIcon)}
            size={size}
            className={hidden ? 'hidden!' : undefined}
        />
    );
}
