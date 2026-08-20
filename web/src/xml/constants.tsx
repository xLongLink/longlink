/** Enumerated XML values mirrored from sdk/longlink/.static/xsd/types.xsd. */
export const ACTION_METHODS = ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'] as const;
export const TEXT_INPUT_TYPES = ['text', 'password', 'email'] as const;
export const ICON_NAMES = [
    'close',
    'chevronDown',
    'chevronLeft',
    'chevronRight',
    'chevronsLeft',
    'chevronsRight',
    'check',
    'success',
    'error',
    'warning',
    'info',
    'calendar',
    'clock',
    'externalLink',
    'menu',
    'moreHorizontal',
    'search',
    'arrowUp',
    'arrowDown',
    'arrowsUpDown',
    'funnel',
    'eyeSlash',
    'viewColumns',
    'copy',
    'checkDouble',
    'wrench',
    'stop',
    'microphone',
] as const;
export const COMPACT_SIZES = ['sm', 'md'] as const;
export const ORIENTATIONS = ['horizontal', 'vertical'] as const;
export const INPUT_STATUSES = ['warning', 'error', 'success'] as const;
export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'destructive'] as const;
export const GRID_REPEATS = ['fill', 'fit'] as const;
export const BOX_ALIGNS = ['start', 'center', 'end', 'stretch'] as const;
export const STACK_JUSTIFICATIONS = ['start', 'center', 'end', 'between', 'around', 'evenly'] as const;
export const STACK_WRAPS = ['nowrap', 'wrap', 'wrap-reverse'] as const;
export const STACK_ITEM_SIZES = ['static', 'fill'] as const;
