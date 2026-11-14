import { cn } from 'cn';
import { usePreview } from './preview';
import { useState, type ComponentProps } from 'react';
import { Skeleton } from '@/components/shadcn/skeleton';
import { AspectRatio } from '@/components/shadcn/aspect-ratio';

type ImageProps = Omit<ComponentProps<'img'>, 'src' | 'alt'> & {
    /** Scoped Solution image path, or an image data/blob URL. */
    src: string;
    /** Accessible description of the photo. */
    alt: string;
    /** Optional frame ratio; omitted images retain their intrinsic proportions. */
    ratio?: number;
    srcSet?: never;
    srcset?: never;
    children?: never;
    dangerouslySetInnerHTML?: never;
};

/** Resolves images through the isolated runtime's scoped file capability. */
export function Image(props: ImageProps) {
    // Give each source its own loading state and object-URL lifecycle.
    return <ImageContent key={props.src} {...props} />;
}

/** Owns one scoped image request and releases its blob URL when unmounted. */
function ImageContent({
    src,
    alt,
    ratio,
    className,
    onError,
    srcSet: _srcSet,
    srcset: _srcset,
    children: _children,
    dangerouslySetInnerHTML: _html,
    ...props
}: ImageProps) {
    const inline = src.startsWith('data:image/') || src.startsWith('blob:');
    const preview = usePreview(src, inline);
    const [erroredUrl, setErroredUrl] = useState<string>();

    // Keep framing opt-in and prevent native source overrides from bypassing the host.
    const content =
        preview.status === 'loading' ? (
            <Skeleton className={ratio === undefined ? 'h-24 w-full' : 'size-full'} aria-hidden="true" />
        ) : preview.status !== 'ready' || erroredUrl === preview.url ? (
            <div
                className="flex size-full items-center justify-center text-sm text-muted-foreground"
                role="status"
                aria-label={alt ? `${alt}: Photo unavailable` : undefined}
            >
                Photo unavailable
            </div>
        ) : (
            <img
                {...props}
                src={preview.url}
                alt={alt}
                className={cn(ratio === undefined ? 'h-auto max-w-full' : 'size-full object-cover', className)}
                onError={(event) => {
                    setErroredUrl(preview.url);
                    onError?.(event);
                }}
            />
        );

    return ratio === undefined ? (
        content
    ) : (
        <AspectRatio ratio={ratio} className="overflow-hidden">
            {content}
        </AspectRatio>
    );
}
