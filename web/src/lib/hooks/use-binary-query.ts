import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RequestContext } from '@/lib/view-capabilities';

export function useBinaryQuery(src: string) {
    const request = useContext(RequestContext);

    return useQuery({
        queryKey: ['api', src, 'binary'],
        queryFn: async () => {
            if (!request) throw new Error('File preview unavailable');
            const body = await request(src, { binary: true });
            if (!(body instanceof Blob)) throw new Error('File preview unavailable');
            return body;
        },
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
    });
}
