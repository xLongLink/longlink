import { useEffect, useRef } from 'react';
import { useBinaryQuery } from '@/lib/hooks/use-binary-query';

export function useImageResource(src: string) {
    const { data, isError } = useBinaryQuery(src);
    const body = data?.type.startsWith('image/') ? data : undefined;
    return { body, unavailable: isError || !!(data && !body) };
}

export function useImageBody(body?: Blob) {
    const image = useRef<HTMLImageElement>(null);

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

    return image;
}
