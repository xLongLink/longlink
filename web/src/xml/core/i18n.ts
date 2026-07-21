import type { ASTProps, ExecutionContext, XmlTranslations } from '../types';
import { evaluate } from '../expressions';

const translationKeyPattern = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;

/** Validates and returns a native Astryx catalog loaded from an application boundary. */
export function validateTranslationCatalog(input: unknown): XmlTranslations {
    // Require a flat object at the catalog root.
    if (input == null || typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('Translation catalog must be an object');
    }

    const catalog: XmlTranslations = {};

    // Validate every key and message entry before the catalog reaches the renderer.
    for (const [key, value] of Object.entries(input)) {
        if (!isTranslationKey(key)) {
            throw new Error(`Invalid translation key "${key}"`);
        }

        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`Translation entry "${key}" must be an object`);
        }

        const entry = value as Record<string, unknown>;
        const unsupported = Object.keys(entry).filter((field) => field !== 'defaultMessage' && field !== 'description');
        if (unsupported.length > 0) {
            throw new Error(`Translation entry "${key}" has unsupported fields: ${unsupported.join(', ')}`);
        }

        if (typeof entry.defaultMessage !== 'string') {
            throw new Error(`Translation entry "${key}" must define a string defaultMessage`);
        }

        if (entry.description !== undefined && typeof entry.description !== 'string') {
            throw new Error(`Translation entry "${key}" must define a string description`);
        }

        catalog[key] = {
            defaultMessage: entry.defaultMessage,
            ...(typeof entry.description === 'string' && { description: entry.description }),
        };
    }

    return catalog;
}

/** Resolves a localized ICU message from the active XML translation bundle. */
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

    // Fail fast when the key is absent from the catalog.
    if (translations[key] === undefined) {
        throw new Error(`Missing translation for key "${key}"`);
    }

    // Require the translator installed by the XML Astryx provider boundary.
    const translate = ctx.translate;
    if (!translate) {
        throw new Error(`Missing Astryx translator for key "${key}"`);
    }

    const values = resolveInterpolationValues(props, ctx);
    const count = resolveCount(props, ctx);
    if (count != null) values.count = count;

    // Always format through ICU so malformed messages and missing values fail visibly.
    return translate(key, values);
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

/** Resolves the values object used for ICU message formatting. */
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
