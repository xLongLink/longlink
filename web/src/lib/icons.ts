import {
    Activity,
    ArrowRight,
    Banknote,
    Bell,
    Box,
    Boxes,
    Building2,
    Check,
    ClipboardList,
    Container,
    Cpu,
    Database,
    Download,
    HardDrive,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    Link as LinkIcon,
    List as ListIcon,
    ListChecks,
    MapPin,
    Plus,
    Rocket,
    RotateCcw,
    Settings2,
    ShieldCheck,
    SlidersHorizontal,
    Timer,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';

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

const ICON_NAME_SET = new Set<string>(ICON_NAMES);

const ICON_COMPONENTS: Record<IconName, LucideIcon> = {
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

/** Returns whether a string is a supported icon slug. */
export function isIconName(name: string): name is IconName {
    return ICON_NAME_SET.has(name);
}

/** Resolves supported icon names to Lucide components. */
export function getIconComponent(name: string): LucideIcon | undefined {
    return isIconName(name) ? ICON_COMPONENTS[name] : undefined;
}
