import { ReferenceArticle, referenceToc, type ReferenceDoc } from '../reference';

export const reference = {
    name: 'Avatar',
    slug: 'avatar',
    category: 'Content',
    summary: 'Shows a user or team identity from an image, name, or fallback.',
    usage: 'Use Avatar anywhere a person or team needs a compact visual identifier.',
    attributes: [
        {
            name: 'src',
            description: 'Primary image URL.',
        },
        {
            name: 'fallbackSrc',
            description: 'Fallback image URL.',
        },
        {
            name: 'name',
            description: 'Name used for initials and default alt text.',
        },
        {
            name: 'alt',
            description: 'Explicit alternative text.',
        },
        {
            name: 'size',
            description: 'xsm, sm, md, lg, or xl.',
        },
    ],
    example: '<Avatar src="$user.avatarUrl" name="$user.name" alt="$user.name" size="lg" />',
} satisfies ReferenceDoc;

export const content = <ReferenceArticle reference={reference} />;

export const metadata = {
    toc: referenceToc(reference),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/avatar.tsx',
};
