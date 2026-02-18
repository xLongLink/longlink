import * as LucideIcons from 'lucide-react';
import {
    AppWindow,
    Box,
    FileText,
    FolderKanban,
    Settings,
    Table2,
    type LucideIcon,
    type LucideProps,
} from 'lucide-react';

type IconProps = LucideProps & {
    name?: string | null;
    fallback?: LucideIcon;
};

const iconAliasMap: Record<string, LucideIcon> = {
    app: AppWindow,
    apps: FolderKanban,
    file: FileText,
    settings: Settings,
    table: Table2,
    tabs: FolderKanban,
};

function normalizeIconName(name: string): string {
    return name.trim().toLowerCase();
}

function toPascalCase(value: string): string {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .filter((part) => part.length > 0)
        .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
        .join('');
}

export function getIconByName(
    name?: string | null,
    fallback: LucideIcon = Box
): LucideIcon {
    if (!name) {
        return fallback;
    }

    const normalizedName = normalizeIconName(name);
    const aliasedIcon = iconAliasMap[normalizedName];

    if (aliasedIcon) {
        return aliasedIcon;
    }

    const iconExport =
        LucideIcons[toPascalCase(normalizedName) as keyof typeof LucideIcons];

    return typeof iconExport === 'function'
        ? (iconExport as LucideIcon)
        : fallback;
}

export function Icon({ name, fallback = Box, ...props }: IconProps) {
    const ResolvedIcon = getIconByName(name, fallback);

    return <ResolvedIcon {...props} />;
}
