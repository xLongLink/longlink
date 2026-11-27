import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/shadcn/spinner';
import { useImageBody, useImageResource } from './use-image-resource';

/** Displays contained artwork in a fixed frame with a missing-image fallback. */
export function Logo({
    src,
    alt,
    variant = 'table',
    padding = 'none'
}: {
    src?: string | null;
    alt: string;
    variant?: 'table' | 'detail';
    padding?: 'none' | 'default';
}) {
    const source = src?.trim() || undefined;
    const detail = variant === 'detail';

    return (
        <span
            className={`relative inline-flex ${detail ? 'size-18' : 'size-10'} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-muted bg-muted align-middle`}
        >
            {!source ? (
                <LogoContent alt={alt} detail={detail} unavailable />
            ) : source.startsWith('data:image/') || source.startsWith('blob:') ? (
                <LogoContent key={source} src={source} alt={alt} detail={detail} padded={padding === 'default'} />
            ) : (
                <ScopedLogo key={source} src={source} alt={alt} detail={detail} padded={padding === 'default'} />
            )}
        </span>
    );
}

function ScopedLogo({ src, alt, detail, padded }: { src: string; alt: string; detail: boolean; padded: boolean }) {
    const resource = useImageResource(src);
    return <LogoContent alt={alt} detail={detail} padded={padded} {...resource} />;
}

function LogoContent({
    src,
    alt,
    detail,
    padded = false,
    body,
    unavailable = false
}: {
    src?: string;
    alt: string;
    detail: boolean;
    padded?: boolean;
    body?: Blob;
    unavailable?: boolean;
}) {
    const image = useImageBody(body);
    const [broken, setBroken] = useState<Blob | string>();
    const [loaded, setLoaded] = useState<Blob | string>();

    useEffect(() => {
        const element = image.current;
        if (!element || body || !src || !element.complete) return;
        if (element.naturalWidth === 0) {
            setBroken(src);
        } else {
            setLoaded(src);
        }
    }, [body, src, image]);

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
                className={`block size-full object-contain object-center${padded ? (detail ? ' p-3' : ' p-1.5') : ''}${loaded === (body ?? src) ? '' : ' invisible'}`}
                onLoad={() => setLoaded(body ?? src)}
                onError={() => setBroken(body ?? src)}
            />
        </>
    );
}
