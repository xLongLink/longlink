import { z } from 'zod';
import { api } from '@/lib/api';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { resolveAnchorUrl } from '../core/url';
import { Text } from '@astryxdesign/core/Text';
import { useXmlRuntime } from '../core/context';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';

const fileViewerPropsSchema = z.object({
    src: xmlNonblankStringSchema,
    title: xmlNonblankStringSchema,
});

type FileViewerMedia = 'pdf' | 'image' | 'video' | 'audio';
type FileViewerState =
    | { status: 'pending' | 'loading' | 'fallback' | 'error' }
    | { status: 'ready'; media: FileViewerMedia; objectUrl: string };

/** Previews PDF documents, images, video, and audio inline with a download fallback for other file types. */
export function FileViewer({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const { src, title } = resolveXmlProps(props, ctx, fileViewerPropsSchema, ['src', 'title']);
    const url = resolveAnchorUrl(services.requestBaseUrl, src);
    const frameRef = useRef<HTMLElement | null>(null);
    const [preview, setPreview] = useState<FileViewerState>({ status: url ? 'pending' : 'error' });
    const { status } = preview;

    // Defer the download until the preview scrolls into view, so hidden dialogs don't fetch upfront.
    useEffect(() => {
        if (!url || status !== 'pending') return;

        const target = frameRef.current;

        if (target == null || typeof IntersectionObserver === 'undefined') {
            setPreview({ status: 'loading' });
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setPreview({ status: 'loading' });
            }
        });
        observer.observe(target);

        return () => observer.disconnect();
    }, [url, status]);

    // Fetch file bytes through the authenticated API client and expose them as a blob URL.
    useEffect(() => {
        if (!url || status !== 'loading') return;

        const controller = new AbortController();
        let previewUrl: string | null = null;
        let cancelled = false;

        void (async () => {
            try {
                const blob = await api(url, { headers: { Accept: '*/*' }, signal: controller.signal }).blob();

                if (cancelled) return;

                // Media elements never execute embedded scripts, so images, video, and audio
                // preview directly while every other non-PDF type falls back to a download link.
                const mediaType: FileViewerMedia | null =
                    blob.type === 'application/pdf'
                        ? 'pdf'
                        : blob.type.startsWith('image/')
                          ? 'image'
                          : blob.type.startsWith('video/')
                            ? 'video'
                            : blob.type.startsWith('audio/')
                              ? 'audio'
                              : null;

                if (mediaType === null) {
                    setPreview({ status: 'fallback' });
                    return;
                }

                previewUrl = URL.createObjectURL(blob);

                setPreview({ status: 'ready', media: mediaType, objectUrl: previewUrl });
            } catch {
                if (!cancelled) {
                    setPreview({ status: 'error' });
                }
            }
        })();

        return () => {
            cancelled = true;
            controller.abort();

            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [url, status]);

    return (
        <Stack ref={frameRef} gap={3} height="65vh">
            {preview.status === 'ready' && preview.media === 'pdf' ? (
                // Chromium blocks PDF rendering inside sandboxed frames, so sandbox must stay off here.
                <iframe title={title} src={preview.objectUrl} className="h-full w-full rounded-lg" />
            ) : preview.status === 'ready' && preview.media === 'image' ? (
                <Center minHeight={192} width="100%">
                    <img
                        alt={title}
                        src={preview.objectUrl}
                        className="max-h-full max-w-full rounded-lg object-contain"
                    />
                </Center>
            ) : preview.status === 'ready' && preview.media === 'video' ? (
                <Center minHeight={192} width="100%">
                    <video
                        aria-label={title}
                        src={preview.objectUrl}
                        controls
                        className="max-h-full w-full rounded-lg"
                    />
                </Center>
            ) : preview.status === 'ready' && preview.media === 'audio' ? (
                <audio aria-label={title} src={preview.objectUrl} controls className="w-full" />
            ) : status === 'fallback' ? (
                <Stack gap={2}>
                    <Text type="supporting">This file type can&apos;t be previewed.</Text>
                    <AstryxLink as="a" isExternalLink href={url}>
                        {title}
                    </AstryxLink>
                </Stack>
            ) : status === 'error' ? (
                <EmptyState title="Preview unavailable" isCompact />
            ) : (
                <Center minHeight={192} width="100%">
                    <Spinner label={`Loading ${title}`} />
                </Center>
            )}
            {renderNode(nodes, ctx)}
        </Stack>
    );
}
