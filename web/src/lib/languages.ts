export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGE_VALUES = ['en', 'it'] as const;

/** Language options currently exposed in account settings. */
export const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English', nativeLabel: 'English' },
    { value: 'it', label: 'Italian', nativeLabel: 'Italiano' },
] as const satisfies Array<{ value: Language; label: string; nativeLabel: string }>;

export type Language = (typeof LANGUAGE_VALUES)[number];

const supportedLanguages = new Set<string>(LANGUAGE_OPTIONS.map((option) => option.value));

/** Returns the closest UI language with a bundled translation catalog. */
export function resolveSupportedLanguage(language: Language | null | undefined): Language {
    const normalizedLanguage = language?.trim().toLowerCase();

    // Default when the user has not selected a language.
    if (!normalizedLanguage) {
        return DEFAULT_LANGUAGE;
    }

    // Return supported language values only.
    if (supportedLanguages.has(normalizedLanguage)) {
        return normalizedLanguage as Language;
    }

    return DEFAULT_LANGUAGE;
}
