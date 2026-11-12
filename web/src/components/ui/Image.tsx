import { Text } from './Text';
import { usePreview } from './preview';
import { Stack } from '@astryxdesign/core/Stack';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';

type ImageProps = {
    /** Scoped Solution image path, or an image data/blob URL. */
    src: string;
    /** Accessible description of the photo. */
    alt: string;
    /** Logos and flags preserve the entire image; flags add padding inside the tile. */
    variant?: 'photo' | 'logo' | 'flag';
    size?: 'sm' | 'md' | 'lg';
};

/** Displays landscape photos or contained square logos through the scoped image capability. */
export function Image(props: ImageProps) {
    // Give each source its own loading state and object-URL lifecycle.
    return <ImageContent key={props.src} {...props} />;
}

/** Owns one scoped image request and releases its blob URL when unmounted. */
function ImageContent({ src, alt, variant = 'photo', size = 'md' }: ImageProps) {
    const inline = src.startsWith('data:image/') || src.startsWith('blob:');
    const preview = usePreview(src, inline);

    // Keep compact images contained in theme-sized tiles throughout their loading lifecycle.
    if (variant === 'logo' || variant === 'flag') {
        const sizes = { sm: 'size-8', md: 'size-10', lg: 'size-12' };

        return (
            <Stack
                className={`${sizes[size]} shrink-0 overflow-hidden rounded-(--radius-element) bg-muted${variant === 'flag' ? ' p-1' : ''}`}
                align="center"
                justify="center"
                role={preview.status === 'ready' ? undefined : 'img'}
                aria-label={preview.status === 'ready' ? undefined : alt}
            >
                {preview.status === 'ready' ? (
                    <img
                        src={preview.url}
                        alt={alt}
                        className={`h-full w-full object-contain${variant === 'flag' ? ' flag-wave' : ''}`}
                    />
                ) : (
                    <Text type="supporting">{alt.slice(0, 1)}</Text>
                )}
            </Stack>
        );
    }

    // Preserve the full-width landscape frame used by existing photo Views.
    return (
        <Stack className="aspect-video w-full overflow-hidden bg-muted" align="center" justify="center">
            {preview.status === 'error' || preview.status === 'unsupported' ? (
                <Text type="supporting">Photo unavailable</Text>
            ) : (
                <Thumbnail
                    src={preview.status === 'ready' ? preview.url : undefined}
                    alt={alt}
                    isLoading={preview.status === 'loading'}
                    className="w-full! [&>div]:aspect-video! [&>div]:rounded-none!"
                />
            )}
        </Stack>
    );
}
