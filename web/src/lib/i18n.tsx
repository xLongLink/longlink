import { InternationalizationProvider, type MessagesByLocale } from '@astryxdesign/core/i18n';
import type { ReactNode } from 'react';
import englishCatalog from '@/translations/en.json';

/** Complete locale catalogs used by platform React and exposed for XML runtime integration. */
export const translationCatalogs: MessagesByLocale = {
    en: englishCatalog,
};

/** Provides the bundled English platform and Astryx translations. */
export function I18nProvider({ children }: { children: ReactNode }) {
    return (
        <InternationalizationProvider locale="en" messages={translationCatalogs}>
            {children}
        </InternationalizationProvider>
    );
}
