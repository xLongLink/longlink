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

    // Default when the user has not selected a language.
    if (!normalizedLanguage) {
        return DEFAULT_LANGUAGE;
    }

    const baseLanguage = normalizedLanguage.split(/[-_]/)[0];
    const languageCandidates = [normalizedLanguage, baseLanguage];

    // Prefer exact matches before falling back to the base language.
    for (const languageCandidate of languageCandidates) {
        // Return the first supported language candidate.
        if (languageCandidate && supportedLanguages.has(languageCandidate)) {
            return languageCandidate as Language;
        }
    }

    return DEFAULT_LANGUAGE;
}
