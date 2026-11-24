import { useEffect } from 'react';
import * as host from '@/views/host';
import { JsxView } from '@/views/host/jsx-view';
import { useQuery } from '@tanstack/react-query';
import { sha256Hex } from '@/views/host/integrity';
import type { ViewRuntime } from '@/views/manifest';
import { Spinner } from '@/components/shadcn/spinner';
import { Button } from '@/components/longlink/action/button';
import { PageError, PageLoading } from '@/components/ui/utils';
import { RELATIVE_URL_ORIGIN, requestUrl, resolveRequestUrl } from '@/lib/url';

/** Loads one routed View and its verified runtime within the same mount lifetime. */
export function SolutionView({
    path,
    viewsUrl,
    runtime,
    params,
    navigationBaseUrl
}: {
    path: string;
    viewsUrl: string;
    runtime: ViewRuntime;
    params: Record<string, string>;
    navigationBaseUrl: string;
}) {
    // Resolve JSX requests beside the manifest without changing its URL form.
    const viewsLocation = new URL(viewsUrl, RELATIVE_URL_ORIGIN);
    const requestBaseLocation = new URL('.', viewsLocation);
    const requestBaseUrl = viewsUrl.startsWith('/') ? requestBaseLocation.pathname : requestBaseLocation.toString();

    const {
        data: source,
        error: sourceError,
        refetch: refetchSource
    } = useQuery({
        queryKey: ['api', 'solution-view', viewsUrl, path],
        queryFn: async ({ signal }) => {
            const viewUrl = resolveRequestUrl(requestBaseUrl, path);
            const body = await host.load(viewUrl, { headers: { Accept: 'text/plain' }, signal });

            return body.text();
        },
        retry: false
    });

    const {
        data: kernel,
        error: runtimeError,
        refetch: refetchRuntime
    } = useQuery({
        queryKey: ['view-runtime', requestBaseUrl, runtime],
        staleTime: Infinity,
        retry: false,
        queryFn: async ({ signal }) => {
            // Load the declared runtime only within its Solution proxy.
            const urls = ['views/runtime.js', 'views/runtime.css'].map((path) => {
                const url = new URL(requestUrl(requestBaseUrl, path), window.location.origin);
                url.searchParams.set('v', runtime.version);

                return url.href;
            });

            const [script, styles] = await Promise.all(
                urls.map(async (url) => {
                    const body = await host.load(url, { signal });

                    return body.text();
                })
            );

            // Reject stale or mixed runtime assets instead of silently rendering with the wrong components.
            const content = `${script}\n${styles}${runtime.modules ? `\n${JSON.stringify(runtime.modules)}` : ''}`;
            const version = await sha256Hex(new TextEncoder().encode(content));

            if (version !== runtime.version) throw new Error('The Solution View runtime does not match its manifest');

            return { script, styles };
        }
    });

    useEffect(() => {
        // Report only the failure stage and error type, never source or response data.
        if (import.meta.env.DEV && runtimeError) console.error('View startup failed: assets', runtimeError.name);
    }, [runtimeError]);

    if (source === undefined && sourceError)
        return (
            <PageError description="The view could not be loaded." title="Unable to load this view">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        void refetchSource();
                        if (runtimeError) void refetchRuntime();
                    }}
                >
                    Retry
                </Button>
            </PageError>
        );

    if (source !== undefined && runtimeError)
        return (
            <PageError
                title="Unable to load this View"
                description="The View runtime assets could not be loaded or did not match the manifest."
            >
                <Button type="button" variant="outline" onClick={() => void refetchRuntime()}>
                    Retry
                </Button>
            </PageError>
        );

    if (source !== undefined && kernel)
        return (
            <JsxView
                source={source}
                params={params}
                requestBaseUrl={requestBaseUrl}
                navigationBaseUrl={navigationBaseUrl}
                runtime={runtime}
                kernel={kernel}
            />
        );

    if (source !== undefined) return <PageLoading label="Preparing View" />;

    return (
        <div className="flex min-h-(--page-content-height) w-full min-w-0 items-center justify-center">
            <Spinner className="motion-reduce:animate-none" />
        </div>
    );
}
