import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, KeyboardEvent as ReactKeyboardEvent, ReactNode, Ref } from 'react';
import { cn } from 'cn';
import { flushSync } from 'react-dom';

import { Button } from '@/components/shadcn/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { ClockIcon } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

/** A time of day. `hour` runs from 0 to 23 whatever the hour cycle. */
export type TimePickerTime = { hour: number; minute: number; second: number };

/** The finest column, and the precision of the value the picker emits. */
export type TimePickerGranularity = 'hour' | 'minute' | 'second';

export type TimePickerHourCycle = 12 | 24;

export type TimePickerPeriod = 'am' | 'pm';

/** Where AM/PM goes: after the time in English, before it in Chinese, Japanese and Korean. */
export type TimePickerPeriodPosition = 'start' | 'end';

export type TimePickerUnit = 'hour' | 'minute' | 'second';

export type TimePickerColumnType = TimePickerUnit | 'period';

export type TimePickerLabels = {
    /** Trigger text while there is no value. */
    placeholder: string;
    /** Column headers, which also name the listboxes. */
    hour: string;
    minute: string;
    second: string;
    period: string;
    am: string;
    pm: string;
    now: string;
    clear: string;
    confirm: string;
    /** Names the popup and an inline panel. */
    panelLabel: string;
    /** The clock button in `TimePickerInput`. */
    openPicker: string;
};

export type TimePickerFormatContext = {
    hourCycle: TimePickerHourCycle;
    granularity: TimePickerGranularity;
    periodPosition: TimePickerPeriodPosition;
    labels: TimePickerLabels;
    /** The merged `formatSegment`, so an override reaches `formatValue` too. */
    formatSegment: TimePickerFunctions['formatSegment'];
};

export type TimePickerFunctions = {
    /** Option text in the columns. In 12-hour time the hour arrives as 1 to 12. */
    formatSegment: (value: number, unit: TimePickerUnit) => string;
    /** The value as the trigger and the input show it. */
    formatValue: (time: TimePickerTime, context: TimePickerFormatContext) => string;
};

export type TimePickerI18nConfig = { labels: TimePickerLabels; functions: TimePickerFunctions };

/** One level deeper than `Partial`, so a single label can be overridden. */
export type TimePickerI18nOverrides = { labels?: Partial<TimePickerLabels>; functions?: Partial<TimePickerFunctions> };

export const DEFAULT_TIME_PICKER_I18N: TimePickerI18nConfig = {
    labels: {
        placeholder: 'Select time',
        hour: 'Hour',
        minute: 'Minute',
        second: 'Second',
        period: 'AM/PM',
        am: 'AM',
        pm: 'PM',
        now: 'Now',
        clear: 'Clear',
        confirm: 'OK',
        panelLabel: 'Choose time',
        openPicker: 'Open time picker'
    },
    functions: {
        formatSegment: (value) => String(value).padStart(2, '0'),
        formatValue: (time, context) => {
            const { hourCycle, granularity, periodPosition, labels } = context;
            const hour = hourCycle === 12 ? time.hour % 12 || 12 : time.hour;
            let text = `${context.formatSegment(hour, 'hour')}:${context.formatSegment(time.minute, 'minute')}`;
            if (granularity === 'second') {
                text += `:${context.formatSegment(time.second, 'second')}`;
            }
            if (hourCycle === 24) return text;
            const period = time.hour < 12 ? labels.am : labels.pm;
            return periodPosition === 'start' ? `${period} ${text}` : `${text} ${period}`;
        }
    }
};

/** Merges per section, so an override can carry one key without restating the rest. */
export function mergeTimePickerI18n(overrides?: TimePickerI18nOverrides): TimePickerI18nConfig {
    if (!overrides?.labels && !overrides?.functions) {
        return DEFAULT_TIME_PICKER_I18N;
    }
    return {
        labels: { ...DEFAULT_TIME_PICKER_I18N.labels, ...overrides.labels },
        functions: { ...DEFAULT_TIME_PICKER_I18N.functions, ...overrides.functions }
    };
}

/* -------------------------------------------------------------------------- */
/*                                   Values                                   */
/* -------------------------------------------------------------------------- */

const pad = (value: number) => String(value).padStart(2, '0');

const toSeconds = (time: TimePickerTime) => time.hour * 3600 + time.minute * 60 + time.second;

const periodOf = (hour: number): TimePickerPeriod => (hour < 12 ? 'am' : 'pm');

const sameTime = (a: TimePickerTime | null, b: TimePickerTime | null) =>
    a === b || (!!a && !!b && toSeconds(a) === toSeconds(b));

/**
 * Reads the value format, the one `<input type="time">` uses: `HH:mm` or
 * `HH:mm:ss` in 24-hour time. A fraction of a second is dropped. Anything
 * else, `""` and `24:00` included, reads as no value.
 */
export function parseTimeValue(value: string | null | undefined): TimePickerTime | null {
    const match = /^\s*(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*$/.exec(value ?? '');
    if (!match) return null;
    const time = { hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3] ?? 0) };
    return time.hour < 24 && time.minute < 60 && time.second < 60 ? time : null;
}

/** Writes the value format: `HH:mm`, or `HH:mm:ss` at `second` granularity. */
export function formatTimeValue(time: TimePickerTime, granularity: TimePickerGranularity = 'minute'): string {
    const value = `${pad(time.hour)}:${pad(time.minute)}`;
    return granularity === 'second' ? `${value}:${pad(time.second)}` : value;
}

/* NFKC folds full-width digits and colons; Arabic-Indic and Persian digits
   need their own map. */
function normalizeTyped(text: string) {
    return text
        .normalize('NFKC')
        .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
        .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
        .replace(/[  ]/g, ' ')
        .toLowerCase();
}

/**
 * Reads what a person types into `TimePickerInput`: `9`, `930`, `0930`,
 * `9:30`, `14.30`, `14h30`, `2:30 pm`, `2p`, a localized period on either
 * side, and full-width, Arabic-Indic or Persian digits. A 12-hour time typed
 * without a period takes `period`.
 */
export function parseTimeInput(
    text: string,
    options: {
        hourCycle?: TimePickerHourCycle;
        period?: TimePickerPeriod;
        labels?: Pick<TimePickerLabels, 'am' | 'pm'>;
    } = {}
): TimePickerTime | null {
    const labels = options.labels ?? DEFAULT_TIME_PICKER_I18N.labels;
    let source = normalizeTyped(text).trim();
    let period: TimePickerPeriod | undefined;
    /* Localized labels first: a lone "a" would also match inside "am". */
    for (const [label, value] of [
        [labels.pm, 'pm'],
        [labels.am, 'am']
    ] as const) {
        const needle = normalizeTyped(label).trim();
        if (needle && source.includes(needle)) {
            period = value;
            source = source.replace(needle, ' ').trim();
            break;
        }
    }
    if (!period) {
        const suffix = /\s*([ap])\.?\s*(?:m\.?)?$/.exec(source);
        if (suffix) {
            period = suffix[1] === 'a' ? 'am' : 'pm';
            source = source.slice(0, suffix.index);
        }
    }
    if (/[^\d\s:.h]/.test(source)) return null;
    const parts = source.split(/[^\d]+/).filter(Boolean);
    let fields = parts;
    if (parts.length === 1 && parts[0].length > 2) {
        /* Packed digits: 930, 0930, 93015, 093015. */
        const digits = parts[0];
        if (digits.length > 6) return null;
        const hourLength = digits.length % 2 === 1 ? 1 : 2;
        fields = [digits.slice(0, hourLength)];
        for (let index = hourLength; index < digits.length; index += 2) {
            fields.push(digits.slice(index, index + 2));
        }
    }
    if (fields.length === 0 || fields.length > 3) return null;
    if (fields.slice(1).some((field) => field.length !== 2)) return null;
    let hour = Number(fields[0]);
    const minute = Number(fields[1] ?? 0);
    const second = Number(fields[2] ?? 0);
    if (minute > 59 || second > 59) return null;
    const resolved =
        period ?? (options.hourCycle === 12 && hour >= 1 && hour <= 12 ? (options.period ?? 'am') : undefined);
    if (resolved) {
        if (hour < 1 || hour > 12) return null;
        hour = (hour % 12) + (resolved === 'pm' ? 12 : 0);
    }
    return hour < 24 ? { hour, minute, second } : null;
}

/* -------------------------------------------------------------------------- */
/*                                    Grid                                    */
/* -------------------------------------------------------------------------- */

/**
 * The selectable times: step-aligned values, a window and a predicate. Times
 * are walked by index, second fastest, so every search is bounded by the grid.
 */
type TimeGrid = {
    hours: number[];
    minutes: number[];
    seconds: number[];
    min: number | null;
    max: number | null;
    granularity: TimePickerGranularity;
    isTimeDisabled?: (value: string, time: TimePickerTime) => boolean;
};

type TimeFilter = Partial<TimePickerTime> & { period?: TimePickerPeriod };

function stepValues(step: number | undefined, limit: number) {
    const size = Math.floor(step ?? 1);
    if (!Number.isFinite(size)) return [0];
    const values: number[] = [];
    for (let value = 0; value < limit; value += Math.max(1, size)) {
        values.push(value);
    }
    return values;
}

const gridSize = (grid: TimeGrid) => grid.hours.length * grid.minutes.length * grid.seconds.length;

function timeAt(grid: TimeGrid, index: number): TimePickerTime {
    const seconds = grid.seconds.length;
    const minutes = grid.minutes.length;
    return {
        hour: grid.hours[Math.floor(index / (minutes * seconds))],
        minute: grid.minutes[Math.floor(index / seconds) % minutes],
        second: grid.seconds[index % seconds]
    };
}

function lastAtOrBelow(values: number[], limit: number) {
    let found = 0;
    for (let index = 0; index < values.length; index++) {
        if (values[index] <= limit) found = index;
    }
    return found;
}

/** The latest grid time at or before `seconds`. Always exists: 00:00:00 is on the grid. */
function floorIndex(grid: TimeGrid, seconds: number) {
    const hour = lastAtOrBelow(grid.hours, seconds / 3600);
    const inHour = seconds - grid.hours[hour] * 3600;
    const minute = lastAtOrBelow(grid.minutes, inHour / 60);
    const second = lastAtOrBelow(grid.seconds, inHour - grid.minutes[minute] * 60);
    return (hour * grid.minutes.length + minute) * grid.seconds.length + second;
}

/* `min` after `max` is an overnight window, 22:00 to 02:00. */
function spanInWindow(grid: TimeGrid, from: number, to: number) {
    const { min, max } = grid;
    if (min !== null && max !== null && min > max) return to >= min || from <= max;
    return (min === null || to >= min) && (max === null || from <= max);
}

function isEnabled(grid: TimeGrid, time: TimePickerTime) {
    const seconds = toSeconds(time);
    return (
        spanInWindow(grid, seconds, seconds) && !grid.isTimeDisabled?.(formatTimeValue(time, grid.granularity), time)
    );
}

function matches(time: TimePickerTime, filter: TimeFilter) {
    return (
        (filter.hour === undefined || time.hour === filter.hour) &&
        (filter.minute === undefined || time.minute === filter.minute) &&
        (filter.second === undefined || time.second === filter.second) &&
        (filter.period === undefined || periodOf(time.hour) === filter.period)
    );
}

/** Whether any enabled time matches `filter`. Hours outside the window cost O(1). */
function hasEnabled(grid: TimeGrid, filter: TimeFilter) {
    for (const hour of grid.hours) {
        if (filter.hour !== undefined && hour !== filter.hour) continue;
        if (filter.period !== undefined && periodOf(hour) !== filter.period) continue;
        if (!spanInWindow(grid, hour * 3600, hour * 3600 + 3599)) continue;
        for (const minute of grid.minutes) {
            if (filter.minute !== undefined && minute !== filter.minute) continue;
            for (const second of grid.seconds) {
                if (filter.second !== undefined && second !== filter.second) continue;
                if (isEnabled(grid, { hour, minute, second })) return true;
            }
        }
    }
    return false;
}

/**
 * The enabled time closest to `target` among those matching `filter`,
 * walking outwards from it. A tie goes to the earlier time.
 */
function nearestEnabled(grid: TimeGrid, target: TimePickerTime, filter: TimeFilter = {}): TimePickerTime | null {
    const goal = toSeconds(target);
    const total = gridSize(grid);
    let back = floorIndex(grid, goal);
    let ahead = back + 1;
    while (back >= 0 || ahead < total) {
        const behind = back >= 0 ? timeAt(grid, back) : null;
        const next = ahead < total ? timeAt(grid, ahead) : null;
        const useBack = !!behind && (!next || goal - toSeconds(behind) <= toSeconds(next) - goal);
        const time = (useBack ? behind : next) as TimePickerTime;
        if (matches(time, filter) && isEnabled(grid, time)) return time;
        if (useBack) back--;
        else ahead++;
    }
    return null;
}

/** The first enabled time from `start` in `direction`, optionally wrapping round the day. */
function walkEnabled(grid: TimeGrid, start: number, direction: 1 | -1, wrap: boolean): TimePickerTime | null {
    const total = gridSize(grid);
    let index = start;
    for (let step = 0; step < total; step++) {
        if (index < 0 || index >= total) {
            if (!wrap) return null;
            index = (index + total) % total;
        }
        const time = timeAt(grid, index);
        if (isEnabled(grid, time)) return time;
        index += direction;
    }
    return null;
}

/** The next enabled time after `from`, or before it with -1, wrapping at midnight. */
function stepEnabled(grid: TimeGrid, from: TimePickerTime, direction: 1 | -1) {
    const index = floorIndex(grid, toSeconds(from));
    const onGrid = sameTime(timeAt(grid, index), from);
    const start = direction === 1 ? index + 1 : onGrid ? index - 1 : index;
    return walkEnabled(grid, start, direction, true);
}

/** The earliest enabled time, counted from `min` so a night shift starts at 22:00. */
function firstEnabledTime(grid: TimeGrid) {
    if (grid.min === null) return walkEnabled(grid, 0, 1, true);
    const index = floorIndex(grid, grid.min);
    const start = toSeconds(timeAt(grid, index)) < grid.min ? index + 1 : index;
    return walkEnabled(grid, start, 1, true);
}

/* -------------------------------------------------------------------------- */
/*                                   Context                                  */
/* -------------------------------------------------------------------------- */

type TimePickerContextValue = {
    id: string;
    /** The committed value. */
    time: TimePickerTime | null;
    /** What the columns show: a pending draft under `requireConfirm`, else the value. */
    display: TimePickerTime | null;
    grid: TimeGrid;
    firstEnabled: TimePickerTime | null;
    hourCycle: TimePickerHourCycle;
    granularity: TimePickerGranularity;
    periodPosition: TimePickerPeriodPosition;
    i18n: TimePickerI18nConfig;
    disabled: boolean;
    readOnly: boolean;
    invalid: boolean;
    requireConfirm: boolean;
    required: boolean;
    fade: boolean;
    label: string | undefined;
    labelledBy: string | undefined;
    describedBy: string | undefined;
    open: boolean;
    setOpen: (open: boolean) => void;
    /** Commits, or writes the draft under `requireConfirm`. */
    select: (time: TimePickerTime | null) => void;
    /** Commits and bypasses the draft. */
    commit: (time: TimePickerTime | null) => void;
    confirm: () => void;
    hasDraft: boolean;
    discardDraft: () => void;
    format: (time: TimePickerTime) => string;
    /** What a column pick aimed at, kept while the value is the time it produced. */
    getGoal: () => ColumnGoal | null;
    setGoal: (goal: ColumnGoal) => void;
    /** The trigger or the input: where a failed `required` check sends focus. */
    registerFocusTarget: (node: HTMLElement | null) => void;
    registerColumns: (node: HTMLElement | null) => void;
    getColumns: () => HTMLElement | null;
};

type ColumnGoal = { goal: TimePickerTime; result: TimePickerTime };

const TimePickerContext = createContext<TimePickerContextValue | null>(null);

/** "inline" unless a part renders inside `TimePickerContent`. */
const SurfaceContext = createContext<'inline' | 'popup'>('inline');

function useTimePickerContext(part: string) {
    const context = useContext(TimePickerContext);
    if (!context) throw new Error(`${part} must be used within a TimePicker`);
    return context;
}

/* The only clock read, inside an action: reading it while rendering would
   differ between the server and the client. It floors to the steps, so 14:38
   on a 15 minute step is 14:30, then looks forward before back. */
function pickNow(context: TimePickerContextValue) {
    const now = new Date();
    const { grid } = context;
    const seconds =
        now.getHours() * 3600 +
        (context.granularity === 'hour' ? 0 : now.getMinutes() * 60) +
        (context.granularity === 'second' ? now.getSeconds() : 0);
    const index = floorIndex(grid, seconds);
    const time = walkEnabled(grid, index, 1, false) ?? walkEnabled(grid, index - 1, -1, false);
    if (time) context.select(time);
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
}

/* -------------------------------------------------------------------------- */
/*                                    Root                                    */
/* -------------------------------------------------------------------------- */

export type TimePickerProps = {
    /** Controlled value, `HH:mm` or `HH:mm:ss` in 24-hour time. `null` is empty. */
    value?: string | null;
    defaultValue?: string | null;
    /** Fires with the new value in the same format, or `null` when cleared. */
    onValueChange?: (value: string | null) => void;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    hourCycle?: TimePickerHourCycle;
    granularity?: TimePickerGranularity;
    periodPosition?: TimePickerPeriodPosition;
    hourStep?: number;
    minuteStep?: number;
    secondStep?: number;
    /** Earliest selectable time, inclusive. After `max`, the window runs overnight. */
    min?: string;
    /** Latest selectable time, inclusive. */
    max?: string;
    /** Marks single times unavailable. Pass a stable function; it runs per candidate time. */
    isTimeDisabled?: (value: string, time: TimePickerTime) => boolean;
    /** Picks, Now and Clear stay a draft until OK; closing discards them. */
    requireConfirm?: boolean;
    /** Fades the top and bottom of a column while more rows are scrolled out of view there. */
    fade?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    invalid?: boolean;
    /** Submits the value with a native form under this name. */
    name?: string;
    form?: string;
    required?: boolean;
    /** The hidden form field, for form libraries that focus a field on error. */
    inputRef?: Ref<HTMLInputElement>;
    /** Lands on the trigger or the input. */
    id?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    i18n?: TimePickerI18nOverrides;
    /** Without children the picker renders a trigger and a popover; these reach the trigger. */
    placeholder?: string;
    className?: string;
    children?: ReactNode;
};

export function TimePicker({
    value,
    defaultValue = null,
    onValueChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    hourCycle = 24,
    granularity = 'minute',
    periodPosition = 'end',
    hourStep,
    minuteStep,
    secondStep,
    min,
    max,
    isTimeDisabled,
    requireConfirm = false,
    fade = true,
    disabled = false,
    readOnly = false,
    invalid = false,
    name,
    form,
    required = false,
    inputRef,
    id: idProp,
    'aria-label': label,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    i18n: i18nProp,
    placeholder,
    className,
    children
}: TimePickerProps) {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [uncontrolled, setUncontrolled] = useState(defaultValue);
    /* What a form reset restores, as a native field returns to its default. */
    const [initialValue] = useState(defaultValue);
    const [openState, setOpenState] = useState(defaultOpen);
    const [draft, setDraft] = useState<{ time: TimePickerTime | null } | null>(null);
    const open = openProp ?? openState;
    /* Every open and close drops the draft, a parent's included. */
    const [seenOpen, setSeenOpen] = useState(open);
    if (seenOpen !== open) {
        setSeenOpen(open);
        setDraft(null);
    }
    const goal = useRef<ColumnGoal | null>(null);
    const focusTarget = useRef<HTMLElement | null>(null);
    const columns = useRef<HTMLElement | null>(null);
    const fieldRef = useRef<HTMLInputElement | null>(null);
    const resetRef = useRef(() => {});

    const raw = (value !== undefined ? value : uncontrolled) || null;
    const time = parseTimeValue(raw);
    const i18n = useMemo(() => mergeTimePickerI18n(i18nProp), [i18nProp]);
    const grid = useMemo<TimeGrid>(
        () => ({
            hours: stepValues(hourStep, 24),
            minutes: granularity === 'hour' ? [0] : stepValues(minuteStep, 60),
            seconds: granularity === 'second' ? stepValues(secondStep, 60) : [0],
            min: parseSeconds(min),
            max: parseSeconds(max),
            granularity,
            isTimeDisabled
        }),
        [hourStep, minuteStep, secondStep, granularity, min, max, isTimeDisabled]
    );
    const firstEnabled = useMemo(() => firstEnabledTime(grid), [grid]);

    const setOpen = (next: boolean) => {
        if (next && disabled) return;
        if (openProp === undefined) setOpenState(next);
        onOpenChange?.(next);
    };

    const commit = (next: TimePickerTime | null) => {
        setDraft(null);
        const nextValue = next ? formatTimeValue(next, granularity) : null;
        if (nextValue === raw) return;
        if (value === undefined) setUncontrolled(nextValue);
        onValueChange?.(nextValue);
    };

    const context: TimePickerContextValue = {
        id,
        time,
        display: draft ? draft.time : time,
        grid,
        firstEnabled,
        hourCycle,
        granularity,
        periodPosition,
        i18n,
        disabled,
        readOnly,
        invalid,
        requireConfirm,
        required,
        fade,
        label,
        labelledBy,
        describedBy,
        open,
        setOpen,
        select: (next) => {
            if (disabled || readOnly) return;
            if (requireConfirm) setDraft({ time: next });
            else commit(next);
        },
        commit,
        confirm: () => {
            if (draft) commit(draft.time);
            if (open) setOpen(false);
        },
        hasDraft: draft !== null,
        discardDraft: () => setDraft(null),
        format: (next) =>
            i18n.functions.formatValue(next, {
                hourCycle,
                granularity,
                periodPosition,
                labels: i18n.labels,
                formatSegment: i18n.functions.formatSegment
            }),
        getGoal: () => goal.current,
        setGoal: (next) => {
            goal.current = next;
        },
        registerFocusTarget: (node) => {
            if (node) focusTarget.current = node;
        },
        registerColumns: (node) => {
            columns.current = node;
        },
        getColumns: () => columns.current
    };

    useEffect(() => {
        resetRef.current = () => commit(parseTimeValue(initialValue));
    });

    /* Listens on the field's own root and asks for its form at reset time, so a
     `form` attribute is honoured. The restore waits a task, like a native
     reset's default action, because any listener may still cancel it. */
    const hasField = !!name || required;
    useEffect(() => {
        const root = fieldRef.current?.getRootNode();
        if (!root) return;
        let pending = 0;
        const onReset = (event: Event) => {
            if (event.target !== fieldRef.current?.form) return;
            pending = window.setTimeout(() => {
                if (!event.defaultPrevented) resetRef.current();
            });
        };
        root.addEventListener('reset', onReset, true);
        return () => {
            root.removeEventListener('reset', onReset, true);
            window.clearTimeout(pending);
        };
    }, [hasField]);

    return (
        <TimePickerContext.Provider value={context}>
            <Popover open={open} onOpenChange={(next) => setOpen(next)}>
                {children === undefined ? (
                    <>
                        <TimePickerTrigger className={className} placeholder={placeholder} />
                        <TimePickerContent />
                    </>
                ) : (
                    children
                )}
            </Popover>
            {hasField && (
                <input
                    ref={(node) => {
                        fieldRef.current = node;
                        assignRef(inputRef, node);
                    }}
                    type="text"
                    name={name}
                    form={form}
                    required={required}
                    disabled={disabled}
                    value={time ? formatTimeValue(time, granularity) : ''}
                    onChange={() => {}}
                    tabIndex={-1}
                    aria-hidden="true"
                    data-slot="time-picker-field"
                    /* A failed `required` check focuses this field; hand that to the control. */
                    onFocus={(event) => {
                        const target =
                            focusTarget.current ?? columns.current?.querySelector<HTMLElement>(LIST_SELECTOR);
                        if (target) target.focus();
                        else event.currentTarget.blur();
                    }}
                    className="pointer-events-none absolute size-px max-w-px opacity-0"
                />
            )}
        </TimePickerContext.Provider>
    );
}

function parseSeconds(value: string | undefined) {
    const time = parseTimeValue(value);
    return time ? toSeconds(time) : null;
}

/* -------------------------------------------------------------------------- */
/*                                  Triggers                                  */
/* -------------------------------------------------------------------------- */

const CLOCK_ICON = <ClockIcon aria-hidden="true" />;

export type TimePickerValueProps = Omit<ComponentProps<'span'>, 'children'> & { placeholder?: ReactNode };

/** The committed value as text, or the placeholder. For custom trigger content. */
export function TimePickerValue({ placeholder, className, ...props }: TimePickerValueProps) {
    const context = useTimePickerContext('TimePickerValue');
    return (
        <span
            id={`${context.id}-value`}
            data-slot="time-picker-value"
            data-placeholder={context.time ? undefined : ''}
            className={cn('truncate', className)}
            {...props}
        >
            {context.time ? context.format(context.time) : (placeholder ?? context.i18n.labels.placeholder)}
        </span>
    );
}

/* `normal-case` and `tracking-normal` undo sera's uppercase button text: the
   trigger reads as a field, not an action. */
const TRIGGER_CLASS =
    'justify-between font-normal normal-case tracking-normal tabular-nums data-placeholder:text-muted-foreground';

export type TimePickerTriggerProps = ComponentProps<typeof Button> & { placeholder?: ReactNode };

/** A shadcn Button that opens the picker. Children replace the value and icon. */
export function TimePickerTrigger({
    className,
    variant = 'outline',
    placeholder,
    children,
    ref,
    ...props
}: TimePickerTriggerProps) {
    const context = useTimePickerContext('TimePickerTrigger');
    const labelledBy = props['aria-labelledby'] ?? context.labelledBy;
    const buttonProps = {
        variant,
        disabled: context.disabled,
        'aria-label': context.label,
        'aria-describedby': context.describedBy,
        ...(context.invalid && { 'aria-invalid': true, 'data-invalid': '' }),
        ...props,
        /* The value stays in the name: a label alone replaces a button's text. */
        'aria-labelledby': labelledBy ? `${labelledBy} ${context.id}-value` : undefined,
        id: context.id,
        ref: (node: HTMLButtonElement | null) => {
            context.registerFocusTarget(node);
            assignRef(ref, node);
        },
        'data-slot': 'time-picker-trigger',
        'data-placeholder': context.time ? undefined : '',
        className: cn(TRIGGER_CLASS, className)
    };
    const content =
        children === undefined ? (
            <>
                <TimePickerValue placeholder={placeholder} />
                <span data-icon="inline-end" aria-hidden="true" className="text-muted-foreground flex">
                    {CLOCK_ICON}
                </span>
            </>
        ) : (
            children
        );

    return (
        <PopoverTrigger id={context.id} render={<Button {...buttonProps} />}>
            {content}
        </PopoverTrigger>
    );
}

export type TimePickerInputProps = Omit<ComponentProps<typeof InputGroupInput>, 'value' | 'defaultValue'>;

/**
 * A typable field with a clock button that opens the picker. Text is read on
 * blur and Enter; ArrowUp and ArrowDown step to the next selectable time and
 * Alt+ArrowDown opens the popover.
 */
export function TimePickerInput({
    className,
    placeholder,
    onBlur,
    onKeyDown,
    onChange,
    ref,
    ...props
}: TimePickerInputProps) {
    const context = useTimePickerContext('TimePickerInput');
    const { grid, time } = context;
    /* `null` while the field shows the value rather than an edit in progress. */
    const [text, setText] = useState<string | null>(null);
    const shown = text ?? (time ? context.format(time) : '');
    const mask =
        context.hourCycle === 12
            ? context.periodPosition === 'start'
                ? '-- --:--'
                : '--:-- --'
            : context.granularity === 'second'
              ? '--:--:--'
              : '--:--';

    const parse = (source: string) => {
        if (context.hourCycle === 24) {
            return parseTimeInput(source, { labels: context.i18n.labels });
        }
        /* No period typed: prefer the one on screen, but not over a time that
       only the other half of the day allows (2:30 with a morning minimum). */
        const period = time ? periodOf(time.hour) : context.firstEnabled ? periodOf(context.firstEnabled.hour) : 'am';
        const options = { hourCycle: 12 as const, labels: context.i18n.labels };
        const here = parseTimeInput(source, { ...options, period });
        const there = parseTimeInput(source, { ...options, period: period === 'am' ? 'pm' : 'am' });
        if (!here || !there || sameTime(here, there)) return here;
        const inBounds = (typed: TimePickerTime) => spanInWindow(grid, toSeconds(typed), toSeconds(typed));
        if (inBounds(here)) return here;
        return inBounds(there) ? there : here;
    };

    const read = () => {
        if (text === null) return;
        setText(null);
        if (!text.trim()) return context.commit(null);
        /* A custom formatValue may not parse back; unchanged text is no edit. */
        if (text === (time ? context.format(time) : '')) return;
        const typed = parse(text);
        if (!typed) return;
        const truncated = {
            hour: typed.hour,
            minute: context.granularity === 'hour' ? 0 : typed.minute,
            second: context.granularity === 'second' ? typed.second : 0
        };
        /* Snaps to the steps as well as the bounds: an enabled time on the grid
       is its own nearest. */
        const next = nearestEnabled(grid, truncated);
        if (next) context.commit(next);
    };

    const clockProps = {
        size: 'icon-xs' as const,
        disabled: context.disabled,
        'aria-label': context.i18n.labels.openPicker,
        'data-slot': 'time-picker-input-trigger'
    };

    return (
        <InputGroup
            data-slot="time-picker-input"
            data-disabled={context.disabled ? '' : undefined}
            className={className}
        >
            <InputGroupInput
                value={shown}
                placeholder={placeholder ?? mask}
                disabled={context.disabled}
                readOnly={context.readOnly}
                required={context.required}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-keyshortcuts="Alt+ArrowDown"
                aria-label={context.label}
                aria-labelledby={context.labelledBy}
                aria-describedby={context.describedBy}
                aria-invalid={context.invalid || undefined}
                className="tabular-nums"
                onChange={(event) => {
                    onChange?.(event);
                    setText(event.target.value);
                }}
                onBlur={(event) => {
                    onBlur?.(event);
                    read();
                }}
                onKeyDown={(event) => {
                    onKeyDown?.(event);
                    if (event.defaultPrevented) return;
                    if (event.key === 'Enter') {
                        /* Flushed, so an implicit form submit reads the new value. */
                        flushSync(() => read());
                    } else if (event.key === 'Escape' && text !== null) {
                        event.preventDefault();
                        setText(null);
                    } else if (event.altKey && event.key === 'ArrowDown') {
                        event.preventDefault();
                        read();
                        context.setOpen(true);
                    } else if (
                        (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
                        !event.altKey &&
                        !context.readOnly
                    ) {
                        event.preventDefault();
                        const direction = event.key === 'ArrowUp' ? 1 : -1;
                        const from = (text !== null && parse(text)) || time;
                        const next = from
                            ? stepEnabled(grid, from, direction)
                            : direction === 1
                              ? context.firstEnabled
                              : walkEnabled(grid, gridSize(grid) - 1, -1, true);
                        setText(null);
                        if (next) context.commit(next);
                    }
                }}
                {...props}
                id={context.id}
                ref={(node: HTMLInputElement | null) => {
                    context.registerFocusTarget(node);
                    assignRef(ref, node);
                }}
            />
            <InputGroupAddon align="inline-end">
                <PopoverTrigger render={<InputGroupButton {...clockProps} />}>{CLOCK_ICON}</PopoverTrigger>
            </InputGroupAddon>
        </InputGroup>
    );
}

/* -------------------------------------------------------------------------- */
/*                                    Panel                                   */
/* -------------------------------------------------------------------------- */

const TABBABLE =
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export type TimePickerContentProps = ComponentProps<typeof PopoverContent>;

/**
 * The popover: columns and footer by default. Tab cycles inside it, as in a
 * date picker dialog, in both twins.
 */
export function TimePickerContent({
    className,
    align = 'start',
    onKeyDown,
    children,
    ...props
}: TimePickerContentProps) {
    const context = useTimePickerContext('TimePickerContent');
    return (
        <PopoverContent
            align={align}
            aria-labelledby={context.labelledBy}
            aria-label={context.labelledBy ? undefined : (context.label ?? context.i18n.labels.panelLabel)}
            className={cn('w-auto gap-0 overflow-hidden p-0', className)}
            onKeyDown={(event) => {
                onKeyDown?.(event);
                if (event.defaultPrevented || event.key !== 'Tab') return;
                if (event.altKey || event.ctrlKey || event.metaKey) return;
                const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(TABBABLE));
                const active = event.currentTarget.ownerDocument.activeElement;
                const first = items[0];
                const last = items[items.length - 1];
                if (!event.shiftKey && active === last) {
                    event.preventDefault();
                    first?.focus();
                } else if (event.shiftKey && active === first) {
                    event.preventDefault();
                    last?.focus();
                }
            }}
            {...props}
        >
            <SurfaceContext.Provider value="popup">
                {children === undefined ? (
                    <>
                        <TimePickerColumns />
                        <TimePickerFooter />
                    </>
                ) : (
                    children
                )}
            </SurfaceContext.Provider>
        </PopoverContent>
    );
}

export type TimePickerPanelProps = ComponentProps<'div'>;

/**
 * The columns and the footer, rendered in place: put it straight inside a
 * `TimePicker`, with no trigger or content, for an always-open picker.
 */
export function TimePickerPanel({ className, children, ...props }: TimePickerPanelProps) {
    const context = useTimePickerContext('TimePickerPanel');
    const inline = useContext(SurfaceContext) === 'inline';
    return (
        <div
            role={inline ? 'group' : undefined}
            aria-labelledby={inline ? context.labelledBy : undefined}
            aria-label={inline && !context.labelledBy ? (context.label ?? context.i18n.labels.panelLabel) : undefined}
            data-slot="time-picker-panel"
            data-disabled={context.disabled ? '' : undefined}
            className={cn('flex w-fit flex-col', className)}
            {...props}
        >
            {children === undefined ? (
                <>
                    <TimePickerColumns />
                    <TimePickerFooter />
                </>
            ) : (
                children
            )}
        </div>
    );
}

export type TimePickerColumnsProps = ComponentProps<'div'>;

/**
 * The row of columns: one per unit the picker needs by default. Always left
 * to right, because a time reads hour first in right-to-left text too.
 */
export function TimePickerColumns({ className, children, ref, ...props }: TimePickerColumnsProps) {
    const context = useTimePickerContext('TimePickerColumns');
    const { display, granularity } = context;
    const period = context.hourCycle === 12 && <TimePickerColumn type="period" />;
    return (
        <div
            dir="ltr"
            data-slot="time-picker-columns"
            className={cn('flex divide-x', className)}
            {...props}
            ref={(node) => {
                context.registerColumns(node);
                assignRef(ref, node);
            }}
        >
            <span id={`${context.id}-current`} hidden>
                {display ? context.format(display) : context.i18n.labels.placeholder}
            </span>
            {children === undefined ? (
                <>
                    {context.periodPosition === 'start' && period}
                    <TimePickerColumn type="hour" />
                    {granularity !== 'hour' && <TimePickerColumn type="minute" />}
                    {granularity === 'second' && <TimePickerColumn type="second" />}
                    {context.periodPosition === 'end' && period}
                </>
            ) : (
                children
            )}
        </div>
    );
}

const LIST_SELECTOR = '[data-slot="time-picker-column-list"]:not([aria-disabled="true"])';

/* Row height and list padding copy the shadcn Select item and Select group
   per style, as custom properties so a list is exactly N rows tall. Lyra's
   group has no padding; it gets 4px here so the focus ring never clips. */
const COLUMN_CLASS =
    'group/time-picker-column flex min-w-16 flex-1 flex-col [--time-picker-option-height:calc(var(--spacing)*7)] [--time-picker-list-padding:calc(var(--spacing)*1)]';

/* The shadcn Select label, centered, with a little more room on top so the
   header clears the surface edge. It gains contrast while its list has
   keyboard focus, which says which column the arrows move. */
const LABEL_CLASS =
    'text-muted-foreground text-center text-xs whitespace-nowrap transition-colors select-none group-has-focus-visible/time-picker-column:text-foreground px-1.5 pt-2 pb-1';

/* Five rows unless an ancestor sets `--time-picker-rows`; keep it odd so the
   selection can sit in the middle. The fade masks only an end with rows
   scrolled past it, so the first and last rows are never dimmed at rest;
   `--time-picker-fade-size` sets its depth. */
const LIST_CLASS =
    'group/time-picker-list relative flex h-[calc(var(--time-picker-option-height)*var(--time-picker-rows,5)+var(--spacing)*(var(--time-picker-rows,5)-1)+var(--time-picker-list-padding)*2)] flex-col gap-1 overflow-y-auto overscroll-contain px-2 py-(--time-picker-list-padding) outline-none [scrollbar-width:none] data-empty:focus-visible:outline-solid data-empty:focus-visible:outline-2 data-empty:focus-visible:-outline-offset-2 data-empty:focus-visible:outline-ring data-fade:[mask-image:linear-gradient(to_bottom,transparent,#000_var(--time-picker-fade-start,0px),#000_calc(100%-var(--time-picker-fade-end,0px)),transparent)] data-overflow-start:[--time-picker-fade-start:var(--time-picker-fade-size,var(--time-picker-option-height))] data-overflow-end:[--time-picker-fade-end:var(--time-picker-fade-size,var(--time-picker-option-height))] [&::-webkit-scrollbar]:hidden';

/* Radius and type follow the shadcn Select item, and the keyboard ring
   follows the shadcn Button's focus ring in each style; the list's padding
   leaves room for it. The filled pill for the value is this primitive's own:
   a select marks its choice with a check. */
const OPTION_CLASS =
    'flex h-(--time-picker-option-height) shrink-0 cursor-default items-center justify-center tabular-nums transition-[color,background-color,box-shadow] duration-100 select-none not-aria-selected:hover:bg-accent not-aria-selected:hover:text-accent-foreground aria-selected:bg-primary aria-selected:font-medium aria-selected:text-primary-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50 forced-colors:aria-selected:bg-[Highlight] forced-colors:aria-selected:text-[HighlightText] forced-colors:group-focus-visible/time-picker-list:data-highlighted:outline-solid forced-colors:group-focus-visible/time-picker-list:data-highlighted:outline-2 group-focus-visible/time-picker-list:data-highlighted:ring-3 ring-ring/50 rounded-md text-sm';

/* Marks which ends of a list have rows scrolled out of view, for the fade.
   Written to the DOM directly: it changes every scroll frame and nothing
   renders from it. */
function syncOverflow(list: HTMLElement) {
    list.toggleAttribute('data-overflow-start', list.scrollTop > 1);
    list.toggleAttribute('data-overflow-end', list.scrollTop + list.clientHeight < list.scrollHeight - 1);
}

type TimePickerOption = {
    value: number | TimePickerPeriod;
    label: string;
    /** The number typed to reach it: 12-hour labels, not 24-hour values. */
    typed: number | null;
    disabled: boolean;
};

export type TimePickerColumnProps = Omit<ComponentProps<'div'>, 'children'> & {
    type: TimePickerColumnType;
    /** Header text. Defaults to the label for the type. */
    label?: ReactNode;
};

/**
 * One unit as a listbox. Selection follows the keyboard, like a native wheel.
 * Renders nothing for a unit the granularity or the hour cycle leaves out.
 */
export function TimePickerColumn({ type, label, className, ...props }: TimePickerColumnProps) {
    const context = useTimePickerContext('TimePickerColumn');
    const { display, grid, hourCycle, i18n, firstEnabled } = context;
    const baseId = useId();
    const listRef = useRef<HTMLDivElement>(null);
    const typeahead = useRef({ text: '', at: 0 });

    const listPeriod: TimePickerPeriod = display
        ? periodOf(display.hour)
        : firstEnabled
          ? periodOf(firstEnabled.hour)
          : 'am';
    const displayHour = display?.hour;
    const displayMinute = display?.minute;
    /* Availability is the expensive part; labels are recomputed freely. */
    const flags = useMemo(() => {
        if (type === 'period') {
            return [hasEnabled(grid, { period: 'am' }), hasEnabled(grid, { period: 'pm' })];
        }
        if (type === 'hour') {
            return grid.hours.map((hour) => hasEnabled(grid, { hour }));
        }
        const values = type === 'minute' ? grid.minutes : grid.seconds;
        return values.map((value) =>
            hasEnabled(grid, {
                hour: displayHour,
                minute: type === 'second' ? displayMinute : value,
                second: type === 'second' ? value : undefined
            })
        );
    }, [type, grid, displayHour, displayMinute]);

    const options = columnOptions(type, grid, flags, hourCycle, listPeriod, i18n);
    const current = display ? (type === 'period' ? periodOf(display.hour) : display[type]) : undefined;
    const selectedIndex = options.findIndex((option) => option.value === current);
    const enabled = options.flatMap((option, index) => (option.disabled ? [] : [index]));
    const highlightIndex = highlightFor(
        options,
        enabled,
        selectedIndex,
        current,
        firstEnabled && !display ? columnValueOf(firstEnabled, type) : undefined
    );
    const highlighted = highlightIndex === -1 ? undefined : options[highlightIndex];
    const optionId = (option: TimePickerOption) => `${baseId}-${option.value}`;
    const highlightedId = highlighted ? optionId(highlighted) : undefined;
    const interactive = !context.disabled;
    const editable = interactive && !context.readOnly;

    /* Centers the highlighted row, instantly, whenever it changes, and again
     when the list resizes: rows take their height from the style, which can
     settle after mount. `offsetTop` ignores the popup's zoom-in transform;
     `scrollIntoView` would not, and would scroll the page too. */
    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const center = () => {
            const option = highlightedId ? list.ownerDocument.getElementById(highlightedId) : null;
            if (option) {
                list.scrollTop = option.offsetTop - (list.clientHeight - option.offsetHeight) / 2;
            }
            syncOverflow(list);
        };
        center();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(center);
        observer.observe(list);
        return () => observer.disconnect();
    }, [highlightedId]);

    const hidden =
        (type === 'period' && hourCycle !== 12) ||
        (type === 'minute' && context.granularity === 'hour') ||
        (type === 'second' && context.granularity !== 'second');
    if (hidden) return null;

    const pick = (option: TimePickerOption) => {
        if (option.disabled || !editable) return;
        /* Aim from the last goal while the value is still what it produced, so
       09:15 through a clamped 08:30 comes back to 09:15, not 09:30. */
        const kept = context.getGoal();
        const base =
            kept && sameTime(kept.result, display) ? kept.goal : (display ?? { hour: 0, minute: 0, second: 0 });
        const target =
            option.value === 'am' || option.value === 'pm'
                ? { ...base, hour: (base.hour % 12) + (option.value === 'pm' ? 12 : 0) }
                : { ...base, [type]: option.value };
        const filter: TimeFilter =
            type === 'period' ? { period: option.value as TimePickerPeriod } : { [type]: option.value as number };
        const time = nearestEnabled(grid, target, filter);
        if (!time) return;
        context.setGoal({ goal: target, result: time });
        context.select(time);
    };

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
        if (event.altKey) {
            if (event.key === 'ArrowUp' && context.open) {
                event.preventDefault();
                context.confirm();
            }
            return;
        }
        /* Where the arrows start: the selected row, between rows for a value
       off the steps, and just short of the highlight when empty. */
        const down = event.key === 'ArrowDown' || event.key === 'PageDown';
        let position = selectedIndex;
        if (position === -1) {
            const above =
                typeof current === 'number'
                    ? options.findIndex((option) => typeof option.value === 'number' && option.value > current)
                    : -1;
            position =
                typeof current === 'number'
                    ? (above === -1 ? options.length : above) - 0.5
                    : highlightIndex === -1
                      ? -0.5
                      : highlightIndex + (down ? -0.5 : 0.5);
        }
        const move = (index: number | undefined) => {
            event.preventDefault();
            if (index !== undefined) pick(options[index]);
        };
        const last = enabled[enabled.length - 1];

        switch (event.key) {
            case 'ArrowDown':
                return move(enabled.find((index) => index > position));
            case 'ArrowUp':
                return move(findLast(enabled, (index) => index < position));
            case 'Home':
                return move(enabled[0]);
            case 'End':
                return move(last);
            case 'PageDown':
                return move(enabled.find((index) => index >= position + 5) ?? last);
            case 'PageUp':
                return move(findLast(enabled, (index) => index <= position - 5) ?? enabled[0]);
            case 'ArrowLeft':
            case 'ArrowRight': {
                event.preventDefault();
                const lists = Array.from(context.getColumns()?.querySelectorAll<HTMLElement>(LIST_SELECTOR) ?? []);
                const at = lists.indexOf(event.currentTarget);
                lists[at + (event.key === 'ArrowRight' ? 1 : -1)]?.focus();
                return;
            }
            case ' ':
                event.preventDefault();
                if (highlighted && highlightIndex !== selectedIndex) pick(highlighted);
                return;
            case 'Enter':
                event.preventDefault();
                if (highlighted && highlightIndex !== selectedIndex) pick(highlighted);
                return context.confirm();
            case 'Escape':
                /* Inline, Escape drops a draft; in the popover it closes it. */
                if (!context.open && context.hasDraft) {
                    event.preventDefault();
                    event.stopPropagation();
                    context.discardDraft();
                }
                return;
        }

        const key = normalizeTyped(event.key);
        if (key.length !== 1) return;
        if (type === 'period') {
            const found = enabled.filter((index) => {
                const option = options[index];
                return (
                    option.value === (key === 'a' ? 'am' : key === 'p' ? 'pm' : '') ||
                    normalizeTyped(option.label).startsWith(key)
                );
            });
            if (found.length === 0) return;
            /* The same letter again moves to the next match. */
            move(found[(found.indexOf(highlightIndex) + 1) % found.length]);
            return;
        }
        if (!/\d/.test(key)) return;
        /* Two digits within a second read as one number: 1 then 4 is 14. */
        const buffer = typeahead.current;
        const fresh = event.timeStamp - buffer.at > 1000;
        let typed = !fresh && buffer.text.length === 1 ? buffer.text + key : key;
        const find = (text: string) => options.findIndex((option) => !option.disabled && option.typed === Number(text));
        let index = find(typed);
        if (index === -1 && typed.length === 2) {
            typed = key;
            index = find(typed);
        }
        if (index === -1) {
            /* "3" on a 15 minute step reaches 30. */
            index = options.findIndex(
                (option) => !option.disabled && option.typed !== null && pad(option.typed).startsWith(typed)
            );
        }
        typeahead.current = { text: typed, at: event.timeStamp };
        if (index !== -1) move(index);
    };

    const headerId = `${baseId}-label`;

    return (
        <div data-slot="time-picker-column" data-type={type} className={cn(COLUMN_CLASS, className)} {...props}>
            <div id={headerId} data-slot="time-picker-column-label" className={LABEL_CLASS}>
                {label ?? i18n.labels[type]}
            </div>
            <div
                ref={listRef}
                role="listbox"
                aria-labelledby={headerId}
                aria-describedby={`${context.id}-current`}
                aria-activedescendant={highlightedId}
                aria-disabled={context.disabled || undefined}
                aria-readonly={context.readOnly || undefined}
                tabIndex={interactive ? 0 : -1}
                data-slot="time-picker-column-list"
                data-empty={highlighted ? undefined : ''}
                data-fade={context.fade ? '' : undefined}
                onKeyDown={interactive ? onKeyDown : undefined}
                onScroll={(event) => syncOverflow(event.currentTarget)}
                className={LIST_CLASS}
            >
                {options.map((option, index) => (
                    <div
                        key={option.value}
                        id={optionId(option)}
                        role="option"
                        aria-selected={index === selectedIndex}
                        aria-disabled={option.disabled || undefined}
                        data-highlighted={index === highlightIndex ? '' : undefined}
                        data-slot="time-picker-option"
                        onClick={editable ? () => pick(option) : undefined}
                        className={OPTION_CLASS}
                    >
                        {option.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

function columnValueOf(time: TimePickerTime, type: TimePickerColumnType) {
    return type === 'period' ? periodOf(time.hour) : time[type];
}

function columnOptions(
    type: TimePickerColumnType,
    grid: TimeGrid,
    flags: boolean[],
    hourCycle: TimePickerHourCycle,
    period: TimePickerPeriod,
    i18n: TimePickerI18nConfig
): TimePickerOption[] {
    const { formatSegment } = i18n.functions;
    if (type === 'period') {
        return (['am', 'pm'] as const).map((value, index) => ({
            value,
            label: i18n.labels[value],
            typed: null,
            disabled: !flags[index]
        }));
    }
    if (type === 'hour') {
        return grid.hours.flatMap((hour, index) => {
            if (hourCycle === 12 && periodOf(hour) !== period) return [];
            const shown = hourCycle === 12 ? hour % 12 || 12 : hour;
            return [{ value: hour, label: formatSegment(shown, 'hour'), typed: shown, disabled: !flags[index] }];
        });
    }
    const values = type === 'minute' ? grid.minutes : grid.seconds;
    return values.map((value, index) => ({
        value,
        label: formatSegment(value, type),
        typed: value,
        disabled: !flags[index]
    }));
}

/**
 * The row the keyboard sits on: the selection; for a value off the steps
 * the enabled row below it; when empty, the first enabled time's row.
 */
function highlightFor(
    options: TimePickerOption[],
    enabled: number[],
    selectedIndex: number,
    current: number | TimePickerPeriod | undefined,
    first: number | TimePickerPeriod | undefined
) {
    if (selectedIndex !== -1) return selectedIndex;
    if (typeof current === 'number') {
        const below = findLast(enabled, (index) => {
            const value = options[index].value;
            return typeof value === 'number' && value < current;
        });
        return below ?? enabled[0] ?? -1;
    }
    const preferred = enabled.find((index) => options[index].value === first);
    return preferred ?? enabled[0] ?? -1;
}

/* `Array.prototype.findLast` is ES2023, newer than many consumers' `lib`. */
function findLast<T>(items: T[], test: (item: T) => boolean) {
    for (let index = items.length - 1; index >= 0; index--) {
        if (test(items[index])) return items[index];
    }
    return undefined;
}

/* -------------------------------------------------------------------------- */
/*                                   Footer                                   */
/* -------------------------------------------------------------------------- */

/* Padding keeps the buttons clear of the popover's corner radius per style. */
const FOOTER_CLASS = 'flex items-center justify-between gap-2 border-t p-1.5';

export type TimePickerFooterProps = ComponentProps<'div'>;

/** The action row. Without children: Now and Clear, plus OK in a popover or under `requireConfirm`. */
export function TimePickerFooter({ className, children, ...props }: TimePickerFooterProps) {
    const context = useTimePickerContext('TimePickerFooter');
    const popup = useContext(SurfaceContext) === 'popup';
    return (
        <div data-slot="time-picker-footer" className={cn(FOOTER_CLASS, className)} {...props}>
            {children === undefined ? (
                <>
                    <TimePickerNow />
                    <TimePickerClear />
                    {(popup || context.requireConfirm) && <TimePickerConfirm />}
                </>
            ) : (
                children
            )}
        </div>
    );
}

export type TimePickerActionProps = ComponentProps<typeof Button>;

/** Sets the current time, floored to the steps and moved inside the bounds. */
export function TimePickerNow({ variant = 'ghost', size = 'sm', onClick, children, ...props }: TimePickerActionProps) {
    const context = useTimePickerContext('TimePickerNow');
    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            disabled={context.disabled || context.readOnly}
            data-slot="time-picker-now"
            onClick={(event) => {
                onClick?.(event);
                if (!event.defaultPrevented) pickNow(context);
            }}
            {...props}
        >
            {children === undefined ? context.i18n.labels.now : children}
        </Button>
    );
}

/** Empties the value, then hands focus to the first column. */
export function TimePickerClear({
    variant = 'ghost',
    size = 'sm',
    className,
    onClick,
    children,
    ...props
}: TimePickerActionProps) {
    const context = useTimePickerContext('TimePickerClear');
    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            disabled={context.disabled || context.readOnly}
            data-slot="time-picker-clear"
            className={cn('text-muted-foreground', className)}
            onClick={(event) => {
                onClick?.(event);
                if (event.defaultPrevented) return;
                context.select(null);
                context.getColumns()?.querySelector<HTMLElement>(LIST_SELECTOR)?.focus({ preventScroll: true });
            }}
            {...props}
        >
            {children === undefined ? context.i18n.labels.clear : children}
        </Button>
    );
}

/** Commits a pending draft and closes the popover. */
export function TimePickerConfirm({ variant, size = 'sm', onClick, children, ...props }: TimePickerActionProps) {
    const context = useTimePickerContext('TimePickerConfirm');
    return (
        <Button
            type="button"
            variant={variant ?? (context.requireConfirm ? 'primary' : 'secondary')}
            size={size}
            disabled={context.disabled}
            data-slot="time-picker-confirm"
            onClick={(event) => {
                onClick?.(event);
                if (!event.defaultPrevented) context.confirm();
            }}
            {...props}
        >
            {children === undefined ? context.i18n.labels.confirm : children}
        </Button>
    );
}
