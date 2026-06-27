import { evaluate } from '../expressions';
import type { ASTProps, ExecutionContext, XmlTranslations } from '../types';

const defaultLocale = 'en';
const pluralRulesCache = new Map<string, Intl.PluralRules>();

/** Resolves a localized string or plural form from the active XML translation bundle. */
export function resolveTranslation(props: ASTProps, ctx: ExecutionContext): string {
    // The i18n prop is a literal dotted lookup key, not an expression.
    const key = props.i18n?.trim();

    if (!key) return '';

    const translations = ctx.translations;

    if (!translations) {
        return key;
    }

    const entry = findTranslationEntry(translations, key);

    if (entry == null) {
        return key;
    }

    if (typeof entry === 'string') {
        return interpolate(entry, props, ctx);
    }

    const count = resolveCount(props, ctx);
    if (count == null) {
        return key;
    }

    // Plural entries use Intl.PluralRules categories and fall back to "other".
    const pluralEntry = entry as Record<string, unknown>;
    const category = getPluralRules(ctx.locale ?? defaultLocale).select(count);
    const template = pluralEntry[category] ?? pluralEntry.other ?? firstPluralTemplate(pluralEntry);

    if (typeof template !== 'string') {
        return key;
    }

    return interpolate(template, props, ctx, count);
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
