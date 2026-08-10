import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "Translations",
    "slug": "translations",
    "category": "Runtime",
    "summary": "Defines localized XML page copy in flat catalog files under src/i18n.",
    "usage": "Keep visible copy in translation catalogs and reference it from XML with i18n keys.",
    "attributesTitle": "Rules",
    "attributes": [
        {
            "name": "location",
            "description": "Catalog files live under src/i18n, such as src/i18n/en.json."
        },
        {
            "name": "shape",
            "description": "Each dotted key maps to an object with defaultMessage and optional description."
        },
        {
            "name": "generator",
            "description": "Run longlink translations generate after adding or renaming XML keys."
        }
    ],
    "example": "{\n  \"orders.title\": {\n    \"defaultMessage\": \"Orders\"\n  },\n  \"orders.count\": {\n    \"defaultMessage\": \"{count, plural, =0 {No orders} one {# order} other {# orders}}\"\n  }\n}"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/translations.tsx',
};
