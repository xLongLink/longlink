import i18next, { type Resource, type i18n } from 'i18next';
import type { ASTProps, ExecutionContext, XmlTranslations } from '../types';
import { evaluate } from '../expressions';

const defaultLocale = 'en';
const pluralCategoryOrder = ['other', 'one', 'few', 'many', 'two', 'zero'] as const;
const pluralCategories = new Set<string>(pluralCategoryOrder);
const translationKeyPattern = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;
const i18nCache = new WeakMap<XmlTranslations, Map<string, i18n>>();

/** Resolves a localized string or plural form from the active XML translation bundle. */
export function resolveTranslation(props: ASTProps, ctx: ExecutionContext): string {
    // The i18n prop is a literal dotted lookup key, never fallback text.
    const key = props.i18n?.trim();

    // Reject missing or malformed translation keys.
    if (!key || !isTranslationKey(key)) {
        throw new Error(`i18n must be a dotted translation key, received "${props.i18n ?? ''}"`);
    }

    // Require the active XML translation catalog.
    const translations = ctx.translations;
    if (!translations) {
        throw new Error(`Missing translation catalog for key "${key}"`);
    }

    const xmlI18n = getXmlI18n(translations, ctx.locale ?? defaultLocale);
    const count = resolveCount(props, ctx);
    const hasText = xmlI18n.exists(key);
    const hasPlural = xmlI18n.exists(key, { count: count ?? 0 });

    // Require counts for plural-only translations.
    if (count == null && !hasText && hasPlural) {
        throw new Error(`Plural translation key "${key}" requires a count prop`);
    }

    // Fail fast when the key is absent from the catalog.
    if (!hasText && !hasPlural) {
        throw new Error(`Missing translation for key "${key}"`);
    }

    const template = xmlI18n.t(key, {
        ...(count != null && { count }),
        interpolation: { skipOnVariables: true },
    });

    // Only string templates can be interpolated.
    if (typeof template !== 'string') {
        throw new Error(`Translation key "${key}" must resolve to a string or plural map`);
    }

    return interpolate(template, props, ctx, count ?? undefined);
}

/** Returns whether a value can be used as a LongLink translation catalog key. */
function isTranslationKey(value: string): boolean {
    return translationKeyPattern.test(value);
}

/** Resolves the active numeric count used for plural selection. */
function resolveCount(props: ASTProps, ctx: ExecutionContext): number | null {
    // Count stays optional so plain localized strings do not need plural data.
    const rawCount = props.count;

    // Skip plural handling when no count is provided.
    if (rawCount == null || rawCount === '') return null;

    const value = evaluate(rawCount, ctx);
    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? null : numberValue;
}

/** Returns an i18next instance for one XML translation catalog and locale. */
function getXmlI18n(translations: XmlTranslations, locale: string): i18n {
    const cachedByLocale = i18nCache.get(translations);
    const cached = cachedByLocale?.get(locale);

    // Reuse the initialized instance for this catalog and locale.
    if (cached) return cached;

    const instance = i18next.createInstance();

    void instance.init({
        defaultNS: 'translation',
        fallbackLng: false,
        initAsync: false,
        interpolation: {
            escapeValue: false,
        },
        lng: locale,
        resources: {
            [locale]: {
                translation: toI18nextResources(translations),
            },
        } as Resource,
        returnNull: false,
        returnObjects: false,
    });

    const nextByLocale = cachedByLocale ?? new Map<string, i18n>();
    nextByLocale.set(locale, instance);
    i18nCache.set(translations, nextByLocale);

    return instance;
}

/** Converts LongLink plural leaves into i18next plural suffix keys. */
function toI18nextResources(input: unknown): unknown {
    // Leave scalar and array values unchanged.
    if (input == null || typeof input !== 'object' || Array.isArray(input)) {
        return input;
    }

    const output: Record<string, unknown> = {};

    // Convert each nested key into i18next-compatible resources.
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        // Expand plural leaves into i18next plural suffix entries.
        if (
            value != null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            isPluralEntry(value as Record<string, unknown>)
        ) {
            const pluralEntry = value as Record<string, string>;
            const fallback = firstPluralTemplate(pluralEntry);

            // Fill every known category so i18next has a fallback.
            for (const category of pluralCategoryOrder) {
                output[`${key}_${category}`] = pluralEntry[category] ?? fallback;
            }

            continue;
        }

        output[key] = toI18nextResources(value);
    }

    return output;
}

/** Returns whether a translation object is a pluralized message leaf. */
function isPluralEntry(entry: Record<string, unknown>): boolean {
    const entries = Object.entries(entry);

    // Empty objects are nested namespaces, not plural leaves.
    if (!entries.length) return false;

    // Plural leaves only contain Intl.PluralRules category names with string templates.
    return entries.every(([key, value]) => pluralCategories.has(key) && typeof value === 'string');
}

/** Returns the first usable plural template when the exact category is missing. */
function firstPluralTemplate(entry: Record<string, unknown>): string | undefined {
    // Keep the first usable plural string if the exact category is missing.
    for (const key of pluralCategoryOrder) {
        const candidate = entry[key];

        // Use the first category with a string template.
        if (typeof candidate === 'string') {
            return candidate;
        }
    }

    return undefined;
}

/** Interpolates simple `{{name}}` placeholders inside a translation string. */
function interpolate(template: string, props: ASTProps, ctx: ExecutionContext, count?: number): string {
    const values = resolveInterpolationValues(props, ctx);

    // Replace simple placeholders with serialized values and the resolved count.
    return template.replace(/\{\{([A-Za-z_$][\w$]*)\}\}/g, (_match, name: string) => {
        // Prefer the resolved plural count placeholder.
        if (name === 'count' && count != null) {
            return String(count);
        }

        const value = values[name];

        // Missing and nullish placeholders render as empty strings.
        if (value == null) {
            return '';
        }

        return String(value);
    });
}

/** Resolves the serializable values object used for translation interpolation. */
function resolveInterpolationValues(props: ASTProps, ctx: ExecutionContext): Record<string, unknown> {
    const rawValues = props.values;

    // Components without interpolation values use an empty object.
    if (rawValues == null || rawValues === '') return {};

    const values = evaluate(rawValues, ctx);

    // Keep interpolation input data-oriented and reject arrays or scalar values.
    if (values == null || typeof values !== 'object' || Array.isArray(values)) {
        throw new Error('values must evaluate to an object');
    }

    return values as Record<string, unknown>;
}
