/** Enumerated XML values mirrored from sdk/longlink/.static/xsd/types.xsd. */
export const ELEVATIONS = ['none', 'low', 'med', 'high'] as const;
export const FIELD_STATUS_VARIANTS = ['attached', 'detached', 'tooltip'] as const;
export const LAYER_PLACEMENTS = ['above', 'below', 'start', 'end'] as const;
export const SELECTOR_VARIANTS = ['input', 'ghost'] as const;
export const ACTION_METHODS = ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'] as const;
export const SIZES = ['sm', 'md', 'lg'] as const;
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
export const BUTTON_HTML_TYPES = ['button', 'submit', 'reset'] as const;
export const FILE_INPUT_MODES = ['dropzone', 'input'] as const;
export const GRID_REPEATS = ['fill', 'fit'] as const;
export const BOX_ALIGNS = ['start', 'center', 'end', 'stretch'] as const;
export const SLIDER_VALUE_DISPLAYS = ['tooltip', 'text', 'none'] as const;
export const STACK_JUSTIFICATIONS = ['start', 'center', 'end', 'between', 'around', 'evenly'] as const;
export const STACK_WRAPS = ['nowrap', 'wrap', 'wrap-reverse'] as const;
export const STACK_ITEM_SIZES = ['static', 'fill'] as const;
export const SWITCH_LABEL_POSITIONS = ['start', 'end'] as const;
export const SWITCH_LABEL_SPACINGS = ['hug', 'spread'] as const;
export const TEXT_ELEMENTS = ['span', 'p', 'div', 'label', 'h1', 'h2', 'h3'] as const;
