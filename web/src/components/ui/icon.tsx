import { cn } from '@/lib/utils';
import {
    Activity,
    ArrowRight,
    BadgeDollarSign,
    BarChart,
    BookOpen,
    Box,
    Boxes,
    Building2,
    ClipboardList,
    Container,
    Copy,
    Cpu,
    Database,
    Download,
    FileCode,
    FileText,
    HardDrive,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    List,
    ListCheck,
    Mail,
    MapPin,
    Menu,
    PackagePlus,
    Rocket,
    Search,
    Settings,
    Settings2,
    Shield,
    ShoppingCart,
    Sparkles,
    Type,
    User,
    Users,
    type LucideIcon,
    type LucideProps,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type IconProps = LucideProps & {
    name: string;
};

const remoteIconCache = new Map<string, string>();
const remoteIconRequests = new Map<string, Promise<string>>();
const lucideIconAssetPath = '/lucide-icons/';

const staticIconRegistry = {
    activity: Activity,
    'arrow-right': ArrowRight,
    'badge-dollar-sign': BadgeDollarSign,
    'bar-chart': BarChart,
    'book-open': BookOpen,
    box: Box,
    boxes: Boxes,
    'building-2': Building2,
    'clipboard-list': ClipboardList,
    container: Container,
    copy: Copy,
    cpu: Cpu,
    database: Database,
    download: Download,
    'file-code': FileCode,
    'file-text': FileText,
    'hard-drive': HardDrive,
    'layout-dashboard': LayoutDashboard,
    'layout-grid': LayoutGrid,
    layers: Layers,
    list: List,
    'list-check': ListCheck,
    mail: Mail,
    'map-pin': MapPin,
    menu: Menu,
    'package-plus': PackagePlus,
    rocket: Rocket,
    search: Search,
    settings: Settings,
    'settings-2': Settings2,
    shield: Shield,
    'shopping-cart': ShoppingCart,
    sparkles: Sparkles,
    type: Type,
    user: User,
    users: Users,
} satisfies Record<string, LucideIcon>;

/** Normalizes XML and app icon names into Lucide's kebab-case format. */
export function normalizeIconName(name: string): string {
    return name
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .toLowerCase()
        .replace(/^-+|-+$/g, '');
}

/** Returns a Lucide-compatible icon component for one normalized icon name. */
export function createLucideIconComponent(name: string): LucideIcon | null {
    const normalizedName = normalizeIconName(name);

    if (!normalizedName) {
        return null;
    }

    return function IconComponent({ className, ...props }: LucideProps) {
        return <Icon name={normalizedName} className={className} {...props} />;
    } as LucideIcon;
}

/** Returns a cached SVG request for one Lucide icon asset. */
function loadRemoteIcon(name: string): Promise<string> {
    const cachedIcon = remoteIconCache.get(name);

    if (cachedIcon) {
        return Promise.resolve(cachedIcon);
    }

    const pendingRequest = remoteIconRequests.get(name);

    if (pendingRequest) {
        return pendingRequest;
    }

    const request = (async () => {
        try {
            const response = await fetch(`${lucideIconAssetPath}${encodeURIComponent(name)}.svg`);

            if (!response.ok) {
                throw new Error(`Failed to load icon "${name}"`);
            }

            const svg = await response.text();
            remoteIconCache.set(name, svg);

            return svg;
        } finally {
            remoteIconRequests.delete(name);
        }
    })();

    remoteIconRequests.set(name, request);

    return request;
}

/** Escapes a value before it is injected into generated SVG markup. */
function escapeSvgAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Adds runtime classes to one trusted local SVG asset. */
function renderRemoteIconMarkup(svg: string, className: string): string {
    return svg.replace('<svg ', `<svg class="${escapeSvgAttribute(className)}" aria-hidden="true" `);
}

/** Fetches and renders one non-static Lucide SVG asset. */
function RemoteIcon({ className, name, ...props }: IconProps) {
    const [svg, setSvg] = useState(() => remoteIconCache.get(name) ?? '');

    // Fetch exactly the requested icon asset. No other Lucide icons are loaded.
    useEffect(() => {
        let cancelled = false;

        setSvg(remoteIconCache.get(name) ?? '');
        void loadRemoteIcon(name)
            .then((loadedSvg) => {
                if (!cancelled) {
                    setSvg(loadedSvg);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSvg('');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [name]);

    if (!svg) {
        return <Box aria-hidden={true} className={className} {...props} />;
    }

    return (
        <span className="contents" dangerouslySetInnerHTML={{ __html: renderRemoteIconMarkup(svg, className ?? '') }} />
    );
}

/** Renders a Lucide icon by name without loading the full dynamic icon set up front. */
export function Icon({ className, name, ...props }: IconProps) {
    const normalizedName = normalizeIconName(name);
    const iconClassName = cn('size-4 shrink-0', className);

    if (!normalizedName) {
        throw new Error(`Unknown icon "${name}"`);
    }

    const StaticIcon = staticIconRegistry[normalizedName as keyof typeof staticIconRegistry];

    if (StaticIcon) {
        return <StaticIcon aria-hidden={true} className={iconClassName} {...props} />;
    }

    return <RemoteIcon name={normalizedName} aria-hidden={true} className={iconClassName} {...props} />;
}
