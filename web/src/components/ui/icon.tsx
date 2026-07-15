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
    Link,
    List,
    ListCheck,
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
    type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isIconName, type IconName } from '@/lib/icons';

const staticIconRegistry = {
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
    link: Link,
    list: List,
    'list-check': ListCheck,
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
} satisfies Record<string, LucideIcon>;

/** Returns a Lucide-compatible icon component for one supported icon name. */
export function createLucideIconComponent(name: string): LucideIcon | null {
    // Ignore unsupported icon names.
    if (!isIconName(name)) {
        return null;
    }

    const iconName: IconName = name;

    return function IconComponent({ className, ...props }: LucideProps) {
        return <Icon className={className} {...props} name={iconName} />;
    } as LucideIcon;
}

/** Renders one supported Lucide icon. */
export function Icon({ className, name, ...props }: LucideProps & { name: IconName }) {
    // Reject unsupported icon names before rendering.
    const StaticIcon = staticIconRegistry[name];
    if (!StaticIcon) {
        throw new Error(`Unknown icon "${name}"`);
    }

    return <StaticIcon aria-hidden={true} className={cn('size-4 shrink-0', className)} {...props} />;
}
