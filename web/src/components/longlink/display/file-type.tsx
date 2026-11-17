import { cn } from 'cn';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

/** The family a type belongs to. It picks the glyph and the default color. */
type FileTypeCategory =
    | 'archive'
    | 'audio'
    | 'code'
    | 'design'
    | 'document'
    | 'empty'
    | 'executable'
    | 'file'
    | 'folder'
    | 'font'
    | 'image'
    | 'presentation'
    | 'spreadsheet'
    | 'video';

type FileTypeExtension = {
    category: FileTypeCategory;
    /** The format's text color class. */
    color?: string;
    /** A short label for a key too long for the band, as DOCK for Dockerfile. */
    label?: string;
};

/* -------------------------------------------------------------------------- */
/*                                 Type table                                 */
/* -------------------------------------------------------------------------- */

/**
 * The color of a format with no brand or family color of its own. A solid page
 * in it read as a dark slab beside the colored ones, so it fills lighter, and
 * its glyph turns dark gray, where white would fade on the pale page.
 */
const NEUTRAL =
    'text-zinc-500 [--file-type-fill:color-mix(in_oklab,currentColor_45%,white)] [--file-type-glyph:color-mix(in_oklab,currentColor_80%,black)]';
/** Yellow takes dark text, as the JavaScript logo does: white on it stays
 * under 3:1 until the 700 step. */
const YELLOW = 'text-yellow-500 [--file-type-foreground:var(--color-yellow-950)]';

/** The family colors, which a format without a brand color of its own takes. */
const CATEGORY_COLORS: Record<FileTypeCategory, string> = {
    archive: NEUTRAL,
    audio: 'text-pink-600',
    code: 'text-blue-600',
    design: 'text-purple-600',
    document: 'text-blue-600',
    empty: NEUTRAL,
    executable: NEUTRAL,
    file: NEUTRAL,
    folder: 'text-violet-600',
    font: NEUTRAL,
    image: 'text-violet-600',
    presentation: 'text-red-600',
    spreadsheet: 'text-green-600',
    video: 'text-blue-600'
};

const CATEGORY_NAMES: Record<FileTypeCategory, string> = {
    archive: 'Archive',
    audio: 'Audio file',
    code: 'Code file',
    design: 'Design file',
    document: 'Document',
    empty: 'File',
    executable: 'Application',
    file: 'File',
    folder: 'Folder',
    font: 'Font file',
    image: 'Image',
    presentation: 'Presentation',
    spreadsheet: 'Spreadsheet',
    video: 'Video'
};

/**
 * Known extensions. A format takes its brand's color (Word blue, Excel green,
 * the GitHub language colors for code), else its family's, and a format with
 * neither (archives, plain text, data, config, fonts, installers) is neutral.
 * Every color is the 600 step, so the set reads as one palette with white
 * label text at 3:1 or better.
 */
const FILE_TYPE_EXTENSIONS = {
    // Documents
    pdf: { category: 'document', color: 'text-orange-600' },
    doc: { category: 'document' },
    docx: { category: 'document' },
    odt: { category: 'document' },
    rtf: { category: 'document' },
    pages: { category: 'document', color: 'text-amber-600' },
    txt: { category: 'document', color: NEUTRAL },
    md: { category: 'document', color: NEUTRAL },
    log: { category: 'document', color: NEUTRAL },
    mdx: { category: 'document', color: YELLOW },
    mdc: { category: 'document', color: NEUTRAL },
    eml: { category: 'document', color: NEUTRAL },
    srt: { category: 'document', color: NEUTRAL },
    vtt: { category: 'document', color: NEUTRAL },
    // Spreadsheets
    xls: { category: 'spreadsheet' },
    xlsx: { category: 'spreadsheet' },
    xlsm: { category: 'spreadsheet' },
    ods: { category: 'spreadsheet' },
    csv: { category: 'spreadsheet' },
    tsv: { category: 'spreadsheet' },
    numbers: { category: 'spreadsheet', label: 'NUM' },
    parquet: { category: 'spreadsheet', color: NEUTRAL, label: 'PARQ' },
    sqlite: { category: 'spreadsheet', color: 'text-sky-600' },
    db: { category: 'spreadsheet', color: NEUTRAL },
    // Presentations
    ppt: { category: 'presentation' },
    pptx: { category: 'presentation' },
    odp: { category: 'presentation' },
    key: { category: 'presentation', color: 'text-blue-600' },
    // Images
    png: { category: 'image', color: YELLOW },
    jpg: { category: 'image' },
    jpeg: { category: 'image' },
    gif: { category: 'image' },
    webp: { category: 'image' },
    avif: { category: 'image' },
    heic: { category: 'image' },
    bmp: { category: 'image' },
    tif: { category: 'image' },
    tiff: { category: 'image' },
    ico: { category: 'image' },
    raw: { category: 'image', color: NEUTRAL },
    svg: { category: 'image', color: YELLOW },
    jxl: { category: 'image' },
    // Video
    mp4: { category: 'video' },
    mov: { category: 'video' },
    avi: { category: 'video' },
    mkv: { category: 'video' },
    webm: { category: 'video' },
    mpeg: { category: 'video' },
    mpg: { category: 'video' },
    wmv: { category: 'video' },
    m3u8: { category: 'video' },
    // Audio
    mp3: { category: 'audio' },
    wav: { category: 'audio' },
    aac: { category: 'audio' },
    flac: { category: 'audio' },
    ogg: { category: 'audio' },
    m4a: { category: 'audio' },
    aiff: { category: 'audio' },
    opus: { category: 'audio' },
    // Code and data
    js: { category: 'code', color: YELLOW },
    jsx: { category: 'code', color: YELLOW },
    mjs: { category: 'code', color: YELLOW },
    ts: { category: 'code' },
    tsx: { category: 'code' },
    html: { category: 'code', color: 'text-orange-600' },
    htm: { category: 'code', color: 'text-orange-600' },
    css: { category: 'code', color: 'text-purple-600' },
    scss: { category: 'code', color: 'text-pink-600' },
    json: { category: 'code', color: NEUTRAL },
    xml: { category: 'code', color: NEUTRAL },
    yaml: { category: 'code', color: NEUTRAL },
    yml: { category: 'code', color: NEUTRAL },
    sql: { category: 'code', color: NEUTRAL },
    py: { category: 'code' },
    java: { category: 'code', color: 'text-orange-600' },
    php: { category: 'code', color: 'text-indigo-600' },
    rb: { category: 'code', color: 'text-red-600' },
    go: { category: 'code', color: 'text-cyan-600' },
    rs: { category: 'code', color: 'text-orange-600' },
    c: { category: 'code', color: NEUTRAL },
    cpp: { category: 'code' },
    h: { category: 'code', color: NEUTRAL },
    cs: { category: 'code', color: 'text-purple-600' },
    sh: { category: 'code', color: 'text-green-600' },
    rss: { category: 'code', color: 'text-orange-600' },
    cjs: { category: 'code', color: YELLOW },
    mts: { category: 'code' },
    vue: { category: 'code', color: 'text-emerald-600' },
    svelte: { category: 'code', color: 'text-orange-600' },
    astro: { category: 'code', color: 'text-orange-600' },
    graphql: { category: 'code', color: 'text-pink-600', label: 'GQL' },
    gql: { category: 'code', color: 'text-pink-600' },
    prisma: { category: 'code', color: 'text-sky-600' },
    wasm: { category: 'code', color: 'text-indigo-600' },
    map: { category: 'code', color: NEUTRAL },
    kt: { category: 'code', color: 'text-violet-600' },
    kts: { category: 'code', color: 'text-violet-600' },
    swift: { category: 'code', color: 'text-red-600' },
    dart: { category: 'code', color: 'text-teal-600' },
    lua: { category: 'code' },
    r: { category: 'code', color: 'text-sky-600' },
    scala: { category: 'code', color: 'text-rose-600' },
    ex: { category: 'code', color: 'text-purple-600' },
    exs: { category: 'code', color: 'text-purple-600' },
    hpp: { category: 'code' },
    cc: { category: 'code' },
    cu: { category: 'code', color: 'text-green-600' },
    ps1: { category: 'code' },
    bat: { category: 'code', color: 'text-green-600' },
    bash: { category: 'code', color: 'text-green-600' },
    zsh: { category: 'code', color: 'text-green-600' },
    gradle: { category: 'code', color: 'text-cyan-600' },
    ipynb: { category: 'code', color: 'text-orange-600' },
    // Config and infrastructure
    env: { category: 'code', color: NEUTRAL },
    toml: { category: 'code', color: NEUTRAL },
    ini: { category: 'code', color: NEUTRAL },
    conf: { category: 'code', color: NEUTRAL },
    jsonc: { category: 'code', color: NEUTRAL },
    lock: { category: 'code', color: NEUTRAL },
    git: { category: 'code', color: 'text-red-600' },
    ignore: { category: 'code', color: NEUTRAL },
    dockerfile: { category: 'code', label: 'DOCK' },
    makefile: { category: 'code', color: 'text-green-600', label: 'MAKE' },
    tf: { category: 'code', color: 'text-purple-600' },
    tfvars: { category: 'code', color: 'text-purple-600' },
    hcl: { category: 'code', color: 'text-purple-600' },
    proto: { category: 'code' },
    jsonl: { category: 'code', color: NEUTRAL },
    ndjson: { category: 'code', color: NEUTRAL },
    diff: { category: 'code', color: NEUTRAL },
    patch: { category: 'code', color: NEUTRAL },
    pem: { category: 'code', color: NEUTRAL },
    crt: { category: 'code', color: NEUTRAL },
    // Archives
    zip: { category: 'archive' },
    rar: { category: 'archive' },
    '7z': { category: 'archive' },
    tar: { category: 'archive' },
    gz: { category: 'archive' },
    tgz: { category: 'archive' },
    bz2: { category: 'archive' },
    xz: { category: 'archive' },
    zst: { category: 'archive' },
    jar: { category: 'archive', color: 'text-orange-600' },
    whl: { category: 'archive', color: 'text-blue-600' },
    // Model weights, packed like an archive
    safetensors: { category: 'archive', label: 'SAFE' },
    gguf: { category: 'archive' },
    onnx: { category: 'archive' },
    pt: { category: 'archive', color: 'text-red-600' },
    // Design
    fig: { category: 'design' },
    sketch: { category: 'design', color: 'text-amber-600' },
    psd: { category: 'design', color: 'text-sky-600' },
    ai: { category: 'design', color: 'text-orange-600' },
    eps: { category: 'design' },
    indd: { category: 'design', color: 'text-pink-600' },
    aep: { category: 'design', color: 'text-violet-600' },
    xd: { category: 'design', color: 'text-fuchsia-600' },
    // Applications
    exe: { category: 'executable' },
    msi: { category: 'executable' },
    dmg: { category: 'executable' },
    apk: { category: 'executable', color: 'text-green-600' },
    deb: { category: 'executable', color: 'text-rose-600' },
    iso: { category: 'executable' },
    app: { category: 'executable' },
    pkg: { category: 'executable' },
    ipa: { category: 'executable' },
    aab: { category: 'executable', color: 'text-green-600' },
    rpm: { category: 'executable', color: 'text-red-600' },
    // Fonts
    ttf: { category: 'font' },
    otf: { category: 'font' },
    woff: { category: 'font' },
    woff2: { category: 'font' }
} satisfies Record<string, FileTypeExtension>;

/** The families that can be passed as a `type` on their own, glyph only. */
const FILE_TYPE_CATEGORIES = [
    'archive',
    'audio',
    'code',
    'design',
    'document',
    'empty',
    'executable',
    'folder',
    'font',
    'image',
    'presentation',
    'spreadsheet',
    'video'
] as const satisfies readonly FileTypeCategory[];

type FileTypeExtensionName = keyof typeof FILE_TYPE_EXTENSIONS;

/** Every type the table knows. Any other string renders as a neutral file. */
type FileTypeName = FileTypeExtensionName | (typeof FILE_TYPE_CATEGORIES)[number];

/* -------------------------------------------------------------------------- */
/*                                 Resolution                                 */
/* -------------------------------------------------------------------------- */

type ResolvedFileType = {
    type: string;
    category: FileTypeCategory;
    /** The extension label, or undefined for a family or an empty file. */
    label?: string;
    color: string;
};

const extensions: Record<string, FileTypeExtension> = FILE_TYPE_EXTENSIONS;

/** `Object.hasOwn` would fail to typecheck in an app below the ES2022 lib. */
function has(record: object, key: string) {
    return Object.prototype.hasOwnProperty.call(record, key);
}

function isCategory(value: string): value is FileTypeCategory {
    return (FILE_TYPE_CATEGORIES as readonly string[]).includes(value);
}

function resolveFileType(type?: string): ResolvedFileType {
    const key = (type ?? '').trim().toLowerCase().replace(/^\.+/, '');

    if (!key || key === 'empty') {
        return { type: 'empty', category: 'empty', color: CATEGORY_COLORS.empty };
    }

    const extension = has(extensions, key) ? extensions[key] : null;
    if (extension) {
        return {
            type: key,
            category: extension.category,
            label: extension.label ?? key.toUpperCase(),
            color: extension.color ?? CATEGORY_COLORS[extension.category]
        };
    }

    if (isCategory(key)) {
        return { type: key, category: key, color: CATEGORY_COLORS[key] };
    }

    return { type: key, category: 'file', label: key.toUpperCase(), color: CATEGORY_COLORS.file };
}

/* -------------------------------------------------------------------------- */
/*                                   Glyphs                                   */
/* -------------------------------------------------------------------------- */

/*
 * Every glyph is drawn in the 24-unit page grid inside one box, x 7 to 17 and
 * y 10 to 20, so it sits under the fold at the same optical weight, and is
 * shown at 75% of it (full size up to 20px, where every pixel counts).
 * Parallel strokes are at least 3 units apart: the stroke stays 1px at every
 * size, and closer lines merge at `mini` (18px, where a unit is 0.75px).
 */
const STROKE = { vectorEffect: 'non-scaling-stroke' } as const;

const GLYPHS: Partial<Record<FileTypeCategory, ReactNode>> = {
    document: <path {...STROKE} d="M8 12h8M8 15h5.5M8 18h7" />,
    spreadsheet: (
        <>
            <rect {...STROKE} x="7.5" y="11" width="9" height="8" rx="1" />
            <path {...STROKE} d="M7.5 14.5h9M11 11v8" />
        </>
    ),
    presentation: (
        <>
            <rect {...STROKE} x="7" y="11" width="10" height="5.5" rx="1" />
            <path {...STROKE} d="m9.5 19.5 2.5-3 2.5 3" />
        </>
    ),
    image: (
        <>
            <path {...STROKE} d="m7 19.5 3.5-5.5 2.75 3.75 1.25-1.75 2.5 3.5Z" />
            <circle {...STROKE} cx="14.25" cy="12" r="1.25" />
        </>
    ),
    video: <path {...STROKE} d="M9.5 11v8l7-4Z" />,
    audio: (
        <>
            <path {...STROKE} d="M12.5 18v-7l3 1.5" />
            <circle {...STROKE} cx="10.75" cy="18" r="1.75" />
        </>
    ),
    code: <path {...STROKE} d="m10 12-3 3 3 3m4-6 3 3-3 3" />,
    archive: (
        <>
            <rect {...STROKE} x="7" y="11" width="10" height="3" rx="0.75" />
            <path {...STROKE} d="M8 14v4.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V14M11 16.5h2" />
        </>
    ),
    design: (
        <>
            <circle {...STROKE} cx="10.5" cy="13" r="2.5" />
            <rect {...STROKE} x="12" y="14.5" width="5" height="5" rx="1" />
        </>
    ),
    executable: (
        <>
            <rect {...STROKE} x="7.5" y="10.75" width="3.5" height="3.5" rx="0.75" />
            <rect {...STROKE} x="13" y="10.75" width="3.5" height="3.5" rx="0.75" />
            <rect {...STROKE} x="7.5" y="16.25" width="3.5" height="3.5" rx="0.75" />
            <rect {...STROKE} x="13" y="16.25" width="3.5" height="3.5" rx="0.75" />
        </>
    ),
    font: <path {...STROKE} d="M8.5 12.5V11h7v1.5M12 11v8m-1.5 0h3" />,
    folder: (
        <path
            {...STROKE}
            d="M7 12a1 1 0 0 1 1-1h2.25a1 1 0 0 1 .8.4l.9 1.1H16a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1Z"
        />
    )
};

/* -------------------------------------------------------------------------- */
/*                                  Variants                                  */
/* -------------------------------------------------------------------------- */

/** The page: 16 by 20 units with 2-unit corners and a rounded 6-unit fold. */
const PAGE_PATH =
    'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7.586a2 2 0 0 1 1.414.586l4.414 4.414A2 2 0 0 1 20 8.414V20a2 2 0 0 1-2 2Z';
const FOLD_PATH = 'M14 2v5a1 1 0 0 0 1 1h5';
/** The folded corner, traced along the page edge so it never leaves the page. */
const FLAP_PATH = 'M13.586 2a2 2 0 0 1 1.414.586l4.414 4.414A2 2 0 0 1 20 8.414V8h-5a1 1 0 0 1-1-1V2Z';

/**
 * CSS variable architecture, all read from the root:
 *
 *   --file-type-size        box width and height, set by `size`
 *   --file-type-stroke      line width; unset, 1px up to 40px, then proportional
 *   --file-type-border      page outline in outline, light and mono; unset, 40%
 *                           muted-foreground, 65% up to 20px
 *   --file-type-fill        solid page; unset, the type color
 *   --file-type-glyph       glyph, custom icon and label in solid; unset, the
 *                           foreground
 *   --file-type-foreground  label text, and the glyph in solid
 *   --file-type-radius      label corners; unset, the style's own (below)
 *
 * The root is an inline-size container and everything inside is measured in
 * `cqw` against it, so a plain Tailwind size class (`size-20`, `size-full`)
 * resizes the label and stroke with the box, not just the box. The label band
 * is the same shape on every type at every size (the Figma's 40px geometry in
 * percent); its text is 24% of the width (9.6px at 40px), so the capitals
 * fill half the band, and shrinks only when its characters would run past
 * the band. `--file-type-chars` carries the length for that fit; 0.72em is a
 * wide uppercase character, measured on WOFF2 and MPEG. Up to 20px the band
 * grows, the text turns semibold at a third of the box (5.8px at the 18px
 * mini), and the outline darkens,
 * or a row icon reads as a smudge.
 *
 * Browsers draw text on a whole-pixel baseline, which left capitals up to
 * half a pixel off center. The band's margin moves it onto that baseline
 * instead (`round()` against the label's own `1cap`), so a consumer's `top-*`
 * still places it; a browser without `round()` or `cap` keeps the plain
 * position.
 *
 * The type color is the root's text color, so one `text-*` class recolors a
 * type.
 */
const fileTypeVariants = cva(
    [
        '@container relative inline-block shrink-0 align-middle leading-none select-none',
        'size-(--file-type-size)',
        '[--file-type-foreground:white]'
    ],
    {
        variants: {
            size: {
                mini: '[--file-type-size:--spacing(4.5)]',
                xs: '[--file-type-size:--spacing(6)]',
                sm: '[--file-type-size:--spacing(8)]',
                md: '[--file-type-size:--spacing(10)]',
                lg: '[--file-type-size:--spacing(12)]',
                xl: '[--file-type-size:--spacing(14)]'
            }
        },
        defaultVariants: { size: 'md' }
    }
);

type FileTypeVariant = 'outline' | 'solid' | 'light' | 'mono';

/**
 * Every type in `mono`: the theme's muted gray in place of its own color, with
 * the label text in the page color so it reads in both themes.
 */
const MONO = 'text-muted-foreground [--file-type-foreground:var(--background)]';

const PAGE_CLASS: Record<FileTypeVariant, string> = {
    outline: 'fill-transparent stroke-(color:--file-type-outline)',
    light: 'fill-muted stroke-(color:--file-type-outline)',
    solid: 'fill-[var(--file-type-fill,currentColor)] stroke-[var(--file-type-fill,currentColor)]',
    mono: 'fill-transparent stroke-(color:--file-type-outline)'
};

const FOLD_CLASS: Record<FileTypeVariant, string> = {
    outline: 'stroke-(color:--file-type-outline)',
    light: 'stroke-(color:--file-type-outline)',
    solid: 'stroke-white/45',
    mono: 'stroke-(color:--file-type-outline)'
};

/**
 * Solid paints the glyph in the foreground and mono in its gray, already light
 * on a dark page. The others use the type color, lifted toward white in dark
 * mode: a 1px line in a 600 shade is near 3:1 on a near-black page, while the
 * label keeps the shade its white text needs.
 */
const GLYPH_CLASS: Record<FileTypeVariant, string> = {
    outline: 'dark:text-[color-mix(in_oklab,currentColor_70%,white)]',
    light: 'dark:text-[color-mix(in_oklab,currentColor_70%,white)]',
    solid: 'text-[color:var(--file-type-glyph,var(--file-type-foreground))]',
    mono: ''
};

/**
 * The label overhangs the page's left edge, so it is a band in front of the
 * sheet. Solid has no band: the text sits on the filled page in the glyph's
 * color, across the page's width (x 4 to 20). Every label up to 4 characters
 * takes one size (20.5cqw, 8.2px at 40px), so a row of mixed types reads
 * even; a longer one shrinks at 0.8em a character (0.9em in semibold up to
 * 20px, where each label fits on its own). Measured, WMV runs 0.875em and
 * WEBM 0.79em: at 20.5cqw WEBM spends most of the side padding, and 21cqw
 * would put it on the page edge, so this is the ceiling.
 * The band's radius is bespoke chrome in the ReUI Badge's proportions per
 * style: 10cqw (4px at 40px) where the badge is `rounded-sm` on 20px, a pill
 * in the round styles, square in lyra and sera. The pill pads 30% of its
 * height a side (20% elsewhere) so the round ends clear the text, and the text
 * fit reads the same padding. A label wider than the fit expects (WEBM: W and M
 * run past 0.72em) spends that extra padding, centered, before it truncates,
 * and never grows past the band's own 95% cap. The no-style fallbacks
 * live in the `var()`s, not in bare rungs: the registry flattens each ladder
 * to one bare rung per style, and a second one would win or lose on class
 * order. The capitals are trimmed to their own height (`text-box`), so they
 * center in the band whatever the font's ascent; the padding keeps a
 * descender from clipping.
 */
const LABEL_TEXT_CLASS: Record<FileTypeVariant, string> = {
    outline: 'text-(color:--file-type-foreground)',
    light: 'text-(color:--file-type-foreground)',
    solid: 'max-w-[calc(200cqw/3)] text-[color:var(--file-type-glyph,var(--file-type-foreground))]',
    mono: 'text-(color:--file-type-foreground)'
};

const LABEL_CLASS: Record<FileTypeVariant, string> = {
    outline: 'bg-current',
    light: 'bg-current',
    solid: 'left-1/6 w-2/3 px-[3cqw] text-[length:min(20.5cqw,calc(65.6cqw/(var(--file-type-chars)*0.8)))] @max-[21px]:px-0 @max-[21px]:text-[length:min(32.5cqw,5.8px,calc(66cqw/(var(--file-type-chars)*0.9)))]',
    mono: 'bg-current'
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

type FileTypeProps = Omit<ComponentProps<'span'>, 'children' | 'className' | 'style'> & {
    /**
     * An extension (`"pdf"`, `".docx"`), a family (`"image"`, `"folder"`) or
     * `"empty"`. Unknown extensions render as a neutral file with their label.
     */
    type?: FileTypeName | (string & {});
    /** `mono` draws every type in the theme's gray instead of its own color. */
    variant?: FileTypeVariant;
    /** A preset box size. */
    size?: VariantProps<typeof fileTypeVariants>['size'];
    /** Replaces the extension label, for a version tag or a document code. */
    label?: ReactNode;
    /**
     * Shows the family glyph instead of the label. A family `type` (`"image"`)
     * or a type with no label shows its glyph without it.
     */
    glyph?: boolean;
    /**
     * A custom icon drawn on the page in place of the glyph and the label, in
     * the glyph's color: a lock on a protected file, a link on a shortcut.
     */
    icon?: ReactNode;
};

function FileType({ type, variant = 'outline', size = 'md', label, glyph, icon, ...props }: FileTypeProps) {
    const resolved = resolveFileType(type);
    // `null` hides the label like "", where `??` would fall back to it.
    const text = label !== undefined ? label : resolved.label;
    const hasText = text !== undefined && text !== null && text !== '';
    // The name spells out a key its label shortens (DOCKERFILE, not DOCK).
    const spelled = resolved.label ? resolved.type.toUpperCase() : undefined;
    const typeName = spelled ? `${spelled} file` : CATEGORY_NAMES[resolved.category];
    // A custom string label is part of what the icon says ("V3, DOCX file").
    const custom = typeof label === 'string' ? label.toUpperCase() : '';
    const name =
        typeof label === 'string' && custom && custom !== resolved.label && custom !== spelled
            ? `${label}, ${typeName}`
            : typeName;
    const hasIcon = icon !== undefined && icon !== null && icon !== false;
    const showLabel = hasText && !glyph && !hasIcon;
    const glyphNode = showLabel || hasIcon ? null : GLYPHS[resolved.category];

    return (
        <span
            role="img"
            aria-label={name}
            data-slot="file-type"
            data-type={resolved.type}
            data-category={resolved.category}
            data-variant={variant}
            data-size={size}
            className={cn(fileTypeVariants({ size }), variant === 'mono' ? MONO : resolved.color)}
            {...props}
        >
            <svg
                data-slot="file-type-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
                className="absolute inset-0 size-full overflow-visible [stroke-width:var(--file-type-stroke,max(1px,2.5cqw))] [--file-type-outline:var(--file-type-border,color-mix(in_oklab,var(--muted-foreground)_40%,transparent))] @max-[21px]:[--file-type-outline:var(--file-type-border,color-mix(in_oklab,var(--muted-foreground)_65%,transparent))]"
            >
                <path {...STROKE} d={PAGE_PATH} className={PAGE_CLASS[variant]} />
                {variant === 'solid' ? <path d={FLAP_PATH} className="fill-white/30 stroke-none" /> : null}
                <path {...STROKE} d={FOLD_PATH} className={FOLD_CLASS[variant]} />
                {glyphNode ? (
                    <g
                        data-slot="file-type-glyph"
                        stroke="currentColor"
                        className={cn('origin-[12px_15px] scale-75 @max-[21px]:scale-100', GLYPH_CLASS[variant])}
                    >
                        {glyphNode}
                    </g>
                ) : null}
            </svg>
            {hasIcon ? (
                <span
                    data-slot="file-type-custom-icon"
                    aria-hidden="true"
                    className={cn(
                        'absolute top-[62.5%] left-1/2 flex size-[37.5cqw] -translate-1/2 items-center justify-center @max-[21px]:size-[50cqw] [&>svg]:size-full',
                        GLYPH_CLASS[variant]
                    )}
                >
                    {icon}
                </span>
            ) : null}
            {showLabel ? (
                <span
                    data-slot="file-type-label"
                    style={{ '--file-type-chars': typeof text === 'string' ? text.length : 4 } as CSSProperties}
                    className={cn(
                        'absolute top-(--file-type-label-y) left-[5%] flex h-(--file-type-label-h) max-w-[95%] items-center justify-center overflow-hidden rounded-[var(--file-type-radius,var(--file-type-label-radius,10cqw))] px-[var(--file-type-label-px,7cqw)] font-medium whitespace-nowrap',
                        'text-[length:min(24cqw,calc((95cqw-2*var(--file-type-label-px,7cqw))/(var(--file-type-chars)*0.72)))] [--file-type-label-h:35%] [--file-type-label-y:45%]',
                        'supports-[margin:round(1cap,1px)]:mt-[calc(round(nearest,calc(var(--file-type-label-y)+(var(--file-type-label-h)+1cap)/2),1px)-var(--file-type-label-y)-(var(--file-type-label-h)+1cap)/2)]',
                        '@max-[21px]:px-[4cqw] @max-[21px]:text-[length:min(32.5cqw,5.8px,calc(87cqw/(var(--file-type-chars)*0.88)))] @max-[21px]:font-semibold @max-[21px]:[--file-type-label-h:45%] @max-[21px]:[--file-type-label-y:40%]',
                        '[--file-type-label-radius:10cqw]',
                        '[--file-type-label-px:7cqw]',
                        LABEL_CLASS[variant]
                    )}
                >
                    <span
                        className={cn(
                            'max-w-[min(95cqw,calc(100%+2*max(0px,var(--file-type-label-px,7cqw)-7cqw)))] shrink-0 truncate py-[0.25em] [text-box:trim-both_cap_alphabetic] @max-[21px]:max-w-full',
                            LABEL_TEXT_CLASS[variant]
                        )}
                    >
                        {text}
                    </span>
                </span>
            ) : null}
        </span>
    );
}

export {
    FILE_TYPE_CATEGORIES,
    FileType,
    fileTypeVariants,
    type FileTypeCategory,
    type FileTypeName,
    type FileTypeProps,
    type FileTypeVariant
};
