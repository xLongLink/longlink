import type { Catalog } from '@astryxdesign/core/i18n';
import { evaluate } from '../expressions';
import type { ASTProps, RuntimeServices, Scope } from '../types';

const translationKeyPattern = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;

/** Validates and returns a native Astryx catalog loaded from an application boundary. */
export function validateTranslationCatalog(input: unknown): Catalog {
    // Require a flat object at the catalog root.
    if (!isRecord(input)) {
        throw new Error('Translation catalog must be an object');
    }

    const catalog: Catalog = {};

    // Validate every key and message entry before the catalog reaches the renderer.
    for (const [key, value] of Object.entries(input)) {
        if (!isTranslationKey(key)) {
            throw new Error(`Invalid translation key "${key}"`);
        }

        if (!isRecord(value)) {
            throw new Error(`Translation entry "${key}" must be an object`);
        }

        const unsupported = Object.keys(value).filter((field) => field !== 'defaultMessage' && field !== 'description');
        if (unsupported.length > 0) {
            throw new Error(`Translation entry "${key}" has unsupported fields: ${unsupported.join(', ')}`);
        }

        if (typeof value.defaultMessage !== 'string') {
            throw new Error(`Translation entry "${key}" must define a string defaultMessage`);
        }

        if (value.description !== undefined && typeof value.description !== 'string') {
            throw new Error(`Translation entry "${key}" must define a string description`);
        }

        catalog[key] = {
            defaultMessage: value.defaultMessage,
            ...(typeof value.description === 'string' && { description: value.description }),
        };
    }

    return catalog;
}

/** Resolves a localized ICU message from the active XML translation bundle. */
export function resolveTranslation(props: ASTProps, ctx: Scope, services: RuntimeServices): string {
    // The i18n prop is a literal dotted lookup key, never fallback text.
    const key = props.i18n?.kind === 'text' ? props.i18n.value.trim() : '';

    // Reject missing or malformed translation keys.
    if (!key || !isTranslationKey(key)) {
        throw new Error(`i18n must be a dotted translation key, received "${key}"`);
    }

    // Require the active XML translation catalog.
    const translations = services.translations;
    if (!translations) {
        throw new Error(`Missing translation catalog for key "${key}"`);
    }

    // Fail fast when the key is absent from the catalog.
    if (translations[key] === undefined) {
        throw new Error(`Missing translation for key "${key}"`);
    }

    // Require the translator installed by the XML Astryx provider boundary.
    const translate = services.translate;
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

/** Returns whether a value is a non-array object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** Resolves the active numeric count used for plural selection. */
function resolveCount(props: ASTProps, ctx: Scope): number | null {
    // Count stays optional so plain localized strings do not need plural data.
    const rawCount = props.count;

    // Skip plural handling when no count is provided.
    if (rawCount == null || (rawCount.kind === 'text' && rawCount.value === '')) return null;

    const value = evaluate(rawCount, ctx);
    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? null : numberValue;
}

/** Resolves the values object used for ICU message formatting. */
function resolveInterpolationValues(props: ASTProps, ctx: Scope): Record<string, unknown> {
    const rawValues = props.values;

    // Components without interpolation values use an empty object.
    if (rawValues == null || (rawValues.kind === 'text' && rawValues.value === '')) return {};

    const values = evaluate(rawValues, ctx);

    // Keep interpolation input data-oriented and reject arrays or scalar values.
    if (!isRecord(values)) {
        throw new Error('values must evaluate to an object');
    }

    return values;
}
