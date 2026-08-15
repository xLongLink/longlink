import type { IconRegistry } from '@astryxdesign/core/Icon';
import type { LucideIcon } from 'lucide-react';
import {
    X,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Check,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    Calendar,
    Clock,
    ExternalLink,
    Menu,
    MoreHorizontal,
    Search,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Filter,
    EyeOff,
    Columns,
    Copy,
    CheckCheck,
    Wrench,
    Square,
    Mic,
} from 'lucide-react';

const iconProps = {
    size: '1em',
    'aria-hidden': true as const,
};

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
    funnel: Filter,
    eyeSlash: EyeOff,
    viewColumns: Columns,
    copy: Copy,
    checkDouble: CheckCheck,
    wrench: Wrench,
    stop: Square,
    microphone: Mic,
} satisfies Record<string, LucideIcon>;

export const stoneIconRegistry: IconRegistry = Object.fromEntries(
    Object.entries(stoneIconComponents).map(([name, Icon]) => [name, <Icon {...iconProps} />])
) as IconRegistry;
