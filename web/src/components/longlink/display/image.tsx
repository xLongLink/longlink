import { cn } from 'cn';
import { Skeleton } from '@/components/shadcn/skeleton';
import { AspectRatio } from '@/components/shadcn/aspect-ratio';
import { FileRequestContext } from '@/components/custom/preview';
import { useContext, useEffect, useState, type ComponentProps } from 'react';

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

type PreviewState = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; url: string };

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
    const request = useContext(FileRequestContext)?.load;
    const inline = src.startsWith('data:image/') || src.startsWith('blob:');
    const [preview, setPreview] = useState<PreviewState>(() =>
        inline ? { status: 'ready', url: src } : { status: 'loading' }
    );

    // Keep each scoped request and its object URL within this mounted preview's lifetime.
    useEffect(() => {
        if (inline) return;

        let active = true;
        let objectUrl: string | undefined;

        /** Accepts image bytes and ignores responses after closing. */
        async function load() {
            try {
                if (!request) throw new Error('Image preview unavailable');
                const value = await request(src);

                if (!active) return;

                // Reject non-image responses without exposing their contents in the View.
                if (!value.type.startsWith('image/')) {
                    setPreview({ status: 'unavailable' });

                    return;
                }

                // oxlint-disable-next-line react/immutability -- Effect-local cleanup; oxc-project/oxc#28401.
                objectUrl = URL.createObjectURL(value);
                setPreview({ status: 'ready', url: objectUrl });
            } catch {
                if (active) setPreview({ status: 'unavailable' });
            }
        }

        void load();

        // Ignore late responses and release only URLs owned by this mounted preview.
        return () => {
            active = false;

            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [inline, request, src]);

    // Keep framing opt-in and prevent native source overrides from bypassing the host.
    const content =
        preview.status === 'loading' ? (
            <Skeleton className={ratio === undefined ? 'h-24 w-full' : 'size-full'} aria-hidden="true" />
        ) : preview.status !== 'ready' ? (
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
                    setPreview({ status: 'unavailable' });
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
