import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    "name": "FileInput",
    "slug": "file-input",
    "category": "Data Input",
    "summary": "Collects browser File values for form actions.",
    "usage": "Use FileInput when an Action form payload needs uploaded files.",
    "attributes": [
        {
            "name": "label or i18n",
            "description": "Accessible field label.",
            "required": true
        },
        {
            "name": "value",
            "description": "File value or writable state binding.",
            "required": true
        },
        {
            "name": "accept",
            "description": "Accepted file extensions or MIME types."
        },
        {
            "name": "mode",
            "description": "input or dropzone."
        },
        {
            "name": "isMultiple",
            "description": "Allows multiple selected files."
        }
    ],
    "example": "<FileInput label=\"Attachment\" value=\"$form.file\" accept=\".pdf\" />"
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/file-input.tsx',
};
