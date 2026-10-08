import { createElement, type ReactNode } from 'react';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
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
    type LucideIcon,
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

export type StoneIconName = keyof typeof stoneIconComponents;

// SAFETY: Every registry entry is created from the complete StoneIconName component map without filtering keys.
export const stoneIconRegistry = Object.fromEntries(
    Object.entries(stoneIconComponents).map(([name, IconComponent]) => [
        name,
        createElement(IconComponent, { 'aria-hidden': true, size: '1em' }),
    ])
) as Record<StoneIconName, ReactNode>;

/** Renders a registered Lucide icon at the requested Astryx size. */
export function Icon({ icon, size }: { icon: StoneIconName; size: 'sm' | 'md' | 'lg' }) {
    return <AstryxIcon icon={stoneIconComponents[icon]} size={size} />;
}
