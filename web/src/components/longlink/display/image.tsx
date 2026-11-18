import { cn } from 'cn';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/shadcn/skeleton';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { RequestContext } from '@/components/custom/contexts';
import { AspectRatio } from '@/components/shadcn/aspect-ratio';
import { useContext, useEffect, useRef, useState, type ComponentProps } from 'react';

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
    return props.src.startsWith('data:image/') || props.src.startsWith('blob:') ? (
        <ImageContent key={props.src} {...props} />
    ) : (
        <ScopedImage key={props.src} {...props} />
    );
}

function ScopedImage(props: ImageProps) {
    const request = useContext(RequestContext)?.request;
    const { data, isError } = useQuery({
        queryKey: ['api', props.src, 'binary', 'image'],
        queryFn: async () => {
            if (!request) throw new Error('Image preview unavailable');
            const body = await request(props.src, { binary: true });
            if (!(body instanceof Blob) || !body.type.startsWith('image/'))
                throw new Error('Image preview unavailable');
            return body;
        },
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
    });
    return <ImageContent {...props} src={undefined} body={data} unavailable={isError} />;
}

function ImageContent({
    src,
    alt,
    ratio,
    className,
    onError,
    ref,
    body,
    unavailable = false,
    srcSet: _srcSet,
    srcset: _srcset,
    children: _children,
    dangerouslySetInnerHTML: _html,
    ...props
}: Omit<ImageProps, 'src'> & { src?: string; body?: Blob; unavailable?: boolean }) {
    const image = useRef<HTMLImageElement>(null);
    const mergedRef = useMergedRefs(image, ref);
    const [broken, setBroken] = useState<Blob | string>();

    useEffect(() => {
        const element = image.current;
        if (!body || !element) return;
        const url = URL.createObjectURL(body);
        element.src = url;

        return () => {
            element.removeAttribute('src');
            URL.revokeObjectURL(url);
        };
    }, [body]);

    // Keep framing opt-in and prevent native source overrides from bypassing the host.
    const content =
        unavailable || (broken !== undefined && broken === (body ?? src)) ? (
            <div
                className="flex size-full items-center justify-center text-sm text-muted-foreground"
                role="status"
                aria-label={alt ? `${alt}: Photo unavailable` : undefined}
            >
                Photo unavailable
            </div>
        ) : src === undefined && body === undefined ? (
            <Skeleton className={ratio === undefined ? 'h-24 w-full' : 'size-full'} aria-hidden="true" />
        ) : (
            <img
                {...props}
                ref={mergedRef}
                src={src}
                alt={alt}
                className={cn(ratio === undefined ? 'h-auto max-w-full' : 'size-full object-cover', className)}
                onError={(event) => {
                    setBroken(body ?? src);
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
