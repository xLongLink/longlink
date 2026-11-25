import { ImageOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/shadcn/spinner';
import { useBinaryQuery } from '@/lib/hooks/use-binary-query';

/** Displays contained artwork in a fixed frame with a missing-image fallback. */
export function Logo({
    src,
    alt,
    variant = 'table'
}: {
    src?: string | null;
    alt: string;
    variant?: 'table' | 'detail';
}) {
    const source = src?.trim() || undefined;
    const detail = variant === 'detail';

    return (
        <span
            className={`relative inline-flex ${detail ? 'size-18' : 'size-10'} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted align-middle`}
        >
            {!source ? (
                <LogoContent alt={alt} detail={detail} unavailable />
            ) : source.startsWith('data:image/') || source.startsWith('blob:') ? (
                <LogoContent key={source} src={source} alt={alt} detail={detail} />
            ) : (
                <ScopedLogo key={source} src={source} alt={alt} detail={detail} />
            )}
        </span>
    );
}

function ScopedLogo({ src, alt, detail }: { src: string; alt: string; detail: boolean }) {
    const { data, isError } = useBinaryQuery(src);
    const body = data?.type.startsWith('image/') ? data : undefined;
    return <LogoContent alt={alt} detail={detail} body={body} unavailable={isError || !!(data && !body)} />;
}

function LogoContent({
    src,
    alt,
    detail,
    body,
    unavailable = false
}: {
    src?: string;
    alt: string;
    detail: boolean;
    body?: Blob;
    unavailable?: boolean;
}) {
    const image = useRef<HTMLImageElement>(null);
    const [broken, setBroken] = useState<Blob | string>();
    const [loaded, setLoaded] = useState<Blob | string>();

    useEffect(() => {
        const element = image.current;
        if (!element) return;
        if (!body) {
            if (src && element.complete) {
                if (element.naturalWidth === 0) setBroken(src);
                else setLoaded(src);
            }
            return;
        }
        const url = URL.createObjectURL(body);
        element.src = url;

        return () => {
            element.removeAttribute('src');
            URL.revokeObjectURL(url);
        };
    }, [body, src]);

    if (unavailable || (broken !== undefined && broken === (body ?? src))) {
        return (
            <ImageOff
                className={`size-full bg-muted ${detail ? 'p-4.5' : 'p-2.5'} text-muted-foreground`}
                role={alt ? 'img' : undefined}
                aria-label={alt ? `${alt}: Logo unavailable` : undefined}
                aria-hidden={alt ? undefined : true}
            />
        );
    }
    const loading = (
        <Spinner
            className={`absolute text-muted-foreground${detail ? ' size-6' : ''}`}
            aria-label={alt ? `Loading ${alt}` : 'Loading logo'}
        />
    );
    if (src === undefined && body === undefined) return loading;

    return (
        <>
            {loaded !== (body ?? src) && loading}
            <img
                ref={image}
                src={src}
                alt={alt}
                width={detail ? 72 : 40}
                height={detail ? 72 : 40}
                className={`block size-full object-contain object-center ${detail ? 'p-3' : 'p-1.5'}${loaded === (body ?? src) ? '' : ' invisible'}`}
                onLoad={() => setLoaded(body ?? src)}
                onError={() => setBroken(body ?? src)}
            />
        </>
    );
}
