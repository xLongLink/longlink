import type { ComponentProps } from 'react';
import type { IconRegistry } from '@astryxdesign/core/Icon';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import {
    X,
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowRight,
    ArrowUp,
    ArrowUpDown,
    Banknote,
    Bell,
    Box,
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
    ClipboardList,
    Clock,
    Columns,
    Container,
    Copy,
    Cpu,
    Database,
    Download,
    ExternalLink,
    EyeOff,
    Filter,
    HardDrive,
    Info,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    Link as LinkIcon,
    List as ListIcon,
    ListChecks,
    MapPin,
    Menu,
    Mic,
    MoreHorizontal,
    Plus,
    Rocket,
    RotateCcw,
    Search,
    Settings2,
    ShieldCheck,
    SlidersHorizontal,
    Square,
    Timer,
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

export const stoneIconRegistry: IconRegistry = Object.fromEntries(
    Object.entries(stoneIconComponents).map(([name, IconComponent]) => [
        name,
        <IconComponent aria-hidden={true} key={name} size="1em" />,
    ])
) as IconRegistry;

export const ICON_NAMES = [
    'activity',
    'arrow-right',
    'banknote',
    'bell',
    'box',
    'boxes',
    'building-2',
    'check',
    'clipboard-list',
    'container',
    'cpu',
    'database',
    'download',
    'hard-drive',
    'layers',
    'layout-dashboard',
    'layout-grid',
    'link',
    'list',
    'list-check',
    'map-pin',
    'plus',
    'rocket',
    'rotate-ccw',
    'settings-2',
    'shield-check',
    'sliders-horizontal',
    'timer',
    'users',
    'x',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const iconNameSet = new Set<string>(ICON_NAMES);

const iconComponents: Record<IconName, LucideIcon> = {
    activity: Activity,
    'arrow-right': ArrowRight,
    banknote: Banknote,
    bell: Bell,
    box: Box,
    boxes: Boxes,
    'building-2': Building2,
    check: Check,
    'clipboard-list': ClipboardList,
    container: Container,
    cpu: Cpu,
    database: Database,
    download: Download,
    'hard-drive': HardDrive,
    layers: Layers,
    'layout-dashboard': LayoutDashboard,
    'layout-grid': LayoutGrid,
    link: LinkIcon,
    list: ListIcon,
    'list-check': ListChecks,
    'map-pin': MapPin,
    plus: Plus,
    rocket: Rocket,
    'rotate-ccw': RotateCcw,
    'settings-2': Settings2,
    'shield-check': ShieldCheck,
    'sliders-horizontal': SlidersHorizontal,
    timer: Timer,
    users: Users,
    x: X,
};

type IconProps = {
    icon: StoneIconName;
    size: ComponentProps<typeof AstryxIcon>['size'];
};

/** Renders a registered Lucide icon at the requested Astryx size. */
export function Icon({ icon, size }: IconProps) {
    return <AstryxIcon icon={stoneIconComponents[icon]} size={size} />;
}

/** Returns whether a string is a supported application icon slug. */
export function isIconName(name: string): name is IconName {
    return iconNameSet.has(name);
}

/** Resolves supported application icon names to Lucide components. */
export function getIconComponent(name: string): LucideIcon | undefined {
    return isIconName(name) ? iconComponents[name] : undefined;
}
