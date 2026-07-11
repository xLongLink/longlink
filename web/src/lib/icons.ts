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

export const ICON_NAME_SET = new Set<string>(ICON_NAMES);

/** Returns whether a string is a supported icon slug. */
export function isIconName(name: string): name is IconName {
    return ICON_NAME_SET.has(name);
}
