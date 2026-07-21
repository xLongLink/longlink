import { useEffect, type ReactNode } from 'react';
import { InternationalizationProvider, type MessagesByLocale } from '@astryxdesign/core/i18n';
import englishCatalog from '@/translations/en.json';
import italianCatalog from '@/translations/it.json';
import { resolveSupportedLanguage, type Language } from '@/lib/languages';

/** Complete locale catalogs used by platform React and exposed for XML runtime integration. */
export const translationCatalogs: MessagesByLocale = {
    en: englishCatalog,
    it: italianCatalog,
};

/** Provides the bundled platform and Astryx translations for the current language. */
export function I18nProvider({ children, language }: { children: ReactNode; language?: Language | null }) {
    const resolvedLanguage = resolveSupportedLanguage(language);

    useEffect(() => {
        document.documentElement.lang = resolvedLanguage;
    }, [resolvedLanguage]);

    return (
        <InternationalizationProvider locale={resolvedLanguage} messages={translationCatalogs}>
            {children}
        </InternationalizationProvider>
    );
}
