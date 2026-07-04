import { evaluate } from '../expressions';
import type { ASTProps, ExecutionContext, XmlTranslations } from '../types';

const defaultLocale = 'en';
const pluralCategories = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const pluralRulesCache = new Map<string, Intl.PluralRules>();
const translationKeyPattern = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;

/** Resolves a localized string or plural form from the active XML translation bundle. */
export function resolveTranslation(props: ASTProps, ctx: ExecutionContext): string {
    // The i18n prop is a literal dotted lookup key, never fallback text.
    const key = props.i18n?.trim();

    if (!key || !isTranslationKey(key)) {
        throw new Error(`i18n must be a dotted translation key, received "${props.i18n ?? ''}"`);
    }

    const translations = ctx.translations;

    if (!translations) {
        throw new Error(`Missing translation catalog for key "${key}"`);
    }

    const entry = findTranslationEntry(translations, key);

    if (entry == null) {
        throw new Error(`Missing translation for key "${key}"`);
    }

    if (typeof entry === 'string') {
        return interpolate(entry, props, ctx);
    }

    if (typeof entry !== 'object' || Array.isArray(entry) || !isPluralEntry(entry as Record<string, unknown>)) {
        throw new Error(`Translation key "${key}" must resolve to a string or plural map`);
    }

    const count = resolveCount(props, ctx);
    if (count == null) {
        throw new Error(`Plural translation key "${key}" requires a count prop`);
    }

    // Plural entries use Intl.PluralRules categories and fall back to "other".
    const pluralEntry = entry as Record<string, unknown>;
    const category = getPluralRules(ctx.locale ?? defaultLocale).select(count);
    const template = pluralEntry[category] ?? pluralEntry.other ?? firstPluralTemplate(pluralEntry);

    if (typeof template !== 'string') {
        throw new Error(`Plural translation key "${key}" does not contain a usable template`);
    }

    return interpolate(template, props, ctx, count);
}


/** Returns whether a value can be used as a LongLink translation catalog key. */
function isTranslationKey(value: string): boolean {
    return translationKeyPattern.test(value);
}

/** Resolves the active numeric count used for plural selection. */
function resolveCount(props: ASTProps, ctx: ExecutionContext): number | null {
    // Count stays optional so plain localized strings do not need plural data.
    const rawCount = props.count;

    if (rawCount == null || rawCount === '') return null;

    const value = evaluate(rawCount, ctx);
    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? null : numberValue;
}

/** Returns a locale-aware plural rule resolver, cached by locale. */
function getPluralRules(locale: string): Intl.PluralRules {
    // Cache per locale to avoid recreating Intl objects on every render.
    const cached = pluralRulesCache.get(locale);

    if (cached) return cached;

    const rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);

    return rules;
}

/** Finds a nested translation entry by dotted path. */
function findTranslationEntry(translations: XmlTranslations, key: string): unknown {
    // Walk the dotted path through nested locale objects.
    return key.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object' || Array.isArray(current)) {
            return undefined;
        }

        return (current as Record<string, unknown>)[segment];
    }, translations);
}


/** Returns whether a translation object is a pluralized message leaf. */
function isPluralEntry(entry: Record<string, unknown>): boolean {
    const entries = Object.entries(entry);

    if (!entries.length) return false;

    // Plural leaves only contain Intl.PluralRules category names with string templates.
    return entries.every(([key, value]) => pluralCategories.has(key) && typeof value === 'string');
}

/** Returns the first usable plural template when the exact category is missing. */
function firstPluralTemplate(entry: Record<string, unknown>): string | undefined {
    // Keep the first usable plural string if the exact category is missing.
    for (const key of ['other', 'one', 'few', 'many', 'two', 'zero']) {
        const candidate = entry[key];

        if (typeof candidate === 'string') {
            return candidate;
        }
    }

    return undefined;
}

/** Interpolates simple `{{name}}` placeholders inside a translation string. */
function interpolate(template: string, props: ASTProps, ctx: ExecutionContext, count?: number): string {
    // Replace simple placeholders with XML prop values and the resolved count.
    return template.replace(/\{\{([A-Za-z_$][\w$]*)\}\}/g, (_match, name: string) => {
        if (name === 'count' && count != null) {
            return String(count);
        }

        const rawValue = props[name];

        if (rawValue == null || rawValue === '') {
            return '';
        }

        const value = evaluate(rawValue, ctx);

        if (value == null) {
            return '';
        }

        return String(value);
    });
}
