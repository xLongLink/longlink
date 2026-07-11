import { cn } from '@/lib/utils';
import kebabCase from 'lodash/kebabCase';
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

/** Normalizes XML and app icon names into Lucide's kebab-case format. */
export function normalizeIconName(name: string): string {
    return kebabCase(name);
}

/** Returns a Lucide-compatible icon component for one normalized icon name. */
export function createLucideIconComponent(name: string): LucideIcon | null {
    const normalizedName = normalizeIconName(name);

    // Ignore empty icon names.
    if (!normalizedName) {
        return null;
    }

    return function IconComponent({ className, ...props }: LucideProps) {
        return <Icon name={normalizedName} className={className} {...props} />;
    } as LucideIcon;
}

/** Renders one supported Lucide icon, falling back to Box for unsupported names. */
export function Icon({ className, name, ...props }: LucideProps & { name: string }) {
    const normalizedName = normalizeIconName(name);

    // Reject empty icon names before rendering.
    if (!normalizedName) {
        throw new Error(`Unknown icon "${name}"`);
    }

    const StaticIcon = staticIconRegistry[normalizedName as keyof typeof staticIconRegistry] ?? Box;

    return <StaticIcon aria-hidden={true} className={cn('size-4 shrink-0', className)} {...props} />;
}
