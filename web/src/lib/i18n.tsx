import i18next, { type Resource } from 'i18next';
import { useEffect, type ReactNode } from 'react';
import { I18nextProvider, initReactI18next, useTranslation as useReactTranslation } from 'react-i18next';
import defaultTranslationCatalog from '@/translations/en.json';
import { DEFAULT_LANGUAGE, resolveSupportedLanguage, type Language } from '@/lib/languages';

type TranslationCatalog = Record<string, unknown>;
type LazyLanguage = Exclude<Language, typeof DEFAULT_LANGUAGE>;

const defaultNamespace = 'translation';
const translationCatalogLoaders: Record<LazyLanguage, () => Promise<TranslationCatalog>> = {
    it: async () => (await import('@/translations/it.json')).default,
};

const translationResources = {
    [DEFAULT_LANGUAGE]: {
        [defaultNamespace]: defaultTranslationCatalog,
    },
} satisfies Resource;

// Initialize i18next once for the browser bundle.
if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
        defaultNS: defaultNamespace,
        fallbackLng: DEFAULT_LANGUAGE,
        initAsync: false,
        interpolation: {
            escapeValue: false,
        },
        lng: DEFAULT_LANGUAGE,
        resources: translationResources,
        returnNull: false,
    });
}

/** Loads a JSON translation catalog into i18next when the language is selected. */
async function loadTranslationCatalog(language: Language): Promise<void> {
    // Skip the default language and already-loaded catalogs.
    if (language === DEFAULT_LANGUAGE || i18next.hasResourceBundle(language, defaultNamespace)) {
        return;
    }

    const loadCatalog = translationCatalogLoaders[language];
    const catalog = await loadCatalog();

    i18next.addResourceBundle(language, defaultNamespace, catalog, true, true);
}

/** Provides bundled API-page translations and follows the current user language. */
export function ApiI18nProvider({ children, language }: { children: ReactNode; language?: Language | null }) {
    const resolvedLanguage = resolveSupportedLanguage(language);

    useEffect(() => {
        let wasCancelled = false;

        document.documentElement.lang = resolvedLanguage;

        // Lazy catalogs need to be registered before i18next switches to the selected language.
        void loadTranslationCatalog(resolvedLanguage)
            .then(() => {
                // Apply the selected language only while the provider is mounted.
                if (!wasCancelled && i18next.language !== resolvedLanguage) {
                    return i18next.changeLanguage(resolvedLanguage);
                }
            })
            .catch(() => {
                // Fall back to the default language when lazy loading fails.
                if (!wasCancelled) {
                    document.documentElement.lang = DEFAULT_LANGUAGE;
                    void i18next.changeLanguage(DEFAULT_LANGUAGE);
                }
            });

        return () => {
            wasCancelled = true;
        };
    }, [resolvedLanguage]);

    return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}

/** Returns the initialized translation hook used by API-mode React pages. */
export function useTranslation() {
    return useReactTranslation();
}
