/** Classifies normalized MIME types without inferring support from filenames. */
export function previewKind(mediaType: string): 'image' | 'audio' | 'video' | 'pdf' | 'text' | undefined {
    if (/^image\/(?:png|jpeg|gif|webp)$/.test(mediaType)) return 'image';
    if (/^audio\/(?:mpeg|ogg)$/.test(mediaType)) return 'audio';
    if (mediaType === 'video/mp4') return 'video';
    if (mediaType === 'application/pdf') return 'pdf';
    if (
        mediaType.startsWith('text/') ||
        /^application\/(?:json|xml|yaml|x-yaml|toml|javascript|x-javascript|graphql|x-sh|x-python|x-php|[\w.+-]+\+(?:json|xml))$/.test(
            mediaType
        )
    ) {
        return 'text';
    }
}
