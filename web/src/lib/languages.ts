export const DEFAULT_LANGUAGE = 'en';

/** Language options currently exposed in account settings. */
export const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English', nativeLabel: 'English' },
    { value: 'it', label: 'Italian', nativeLabel: 'Italiano' },
] as const;

export type Language = (typeof LANGUAGE_OPTIONS)[number]['value'];

export type UserLanguage = Language | (string & {});

const supportedLanguages = new Set<string>(LANGUAGE_OPTIONS.map((option) => option.value));

/** Returns the closest UI language with a bundled translation catalog. */
export function resolveSupportedLanguage(language: UserLanguage | null | undefined): Language {
    const normalizedLanguage = language?.trim().toLowerCase();

    if (!normalizedLanguage) {
        return DEFAULT_LANGUAGE;
    }

    const baseLanguage = normalizedLanguage.split(/[-_]/)[0];
    const languageCandidates = [normalizedLanguage, baseLanguage];

    for (const languageCandidate of languageCandidates) {
        if (languageCandidate && supportedLanguages.has(languageCandidate)) {
            return languageCandidate as Language;
        }
    }

    return DEFAULT_LANGUAGE;
}
