import { createElement, type ComponentProps } from 'react';
import type { IconRegistry } from '@astryxdesign/core/Icon';
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
    Search,
    Square,
    UserRound,
    Users,
    Wrench,
    XCircle,
    type LucideIcon,
} from 'lucide-react';

export const stoneIconComponents = {
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
    hardDrive: HardDrive,
    userRound: UserRound,
    users: Users,
} satisfies Record<string, LucideIcon>;

export type StoneIconName = keyof typeof stoneIconComponents;

export const stoneIconRegistry = Object.fromEntries(
    Object.entries(stoneIconComponents).map(([name, IconComponent]) => [
        name,
        createElement(IconComponent, { 'aria-hidden': true, size: '1em' }),
    ])
) as IconRegistry;

/** Renders a registered Lucide icon at the requested Astryx size. */
export function Icon({ icon, size }: { icon: StoneIconName; size: ComponentProps<typeof AstryxIcon>['size'] }) {
    return <AstryxIcon icon={stoneIconComponents[icon]} size={size} />;
}
