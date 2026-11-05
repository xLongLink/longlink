import { FileRequestContext } from './preview';
import { ReportedError } from '@/lib/reported';
import { Text } from '@astryxdesign/core/Text';
import { resolveNavigationUrl } from '@/lib/url';
import { LinkNavigationContext } from './contexts';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { useContext, useState, type ComponentPropsWithRef, type ReactNode } from 'react';

/** Preserves native link gestures while routing ordinary internal clicks through the host. */
export function NavigationLink({ href, target, onClick, ...props }: ComponentPropsWithRef<'a'>) {
    const navigation = useContext(LinkNavigationContext);
    const internalHref = navigation && href ? resolveNavigationUrl(navigation.baseUrl, href) : '';
    let destination = navigation ? internalHref || undefined : href;

    // Native external navigation accepts only the same HTTP(S) destinations as the host bridge.
    if (
        navigation &&
        href &&
        !internalHref &&
        (URL.canParse(href.trim()) || href.trim().startsWith('//')) &&
        URL.canParse(href.trim(), document.baseURI)
    ) {
        const url = new URL(href.trim(), document.baseURI);

        if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password) {
            destination = url.href;
        }
    }

    // External destinations leave the frame; internal modifier-clicks retain browser defaults.
    return (
        <a
            {...props}
            href={destination}
            target={navigation && !internalHref ? '_blank' : target}
            rel="noopener noreferrer"
            onClick={(event) => {
                onClick?.(event);

                if (event.defaultPrevented) return;

                if (!destination) {
                    event.preventDefault();

                    return;
                }

                if (
                    navigation &&
                    href &&
                    internalHref &&
                    (!target || target === '_self') &&
                    event.button === 0 &&
                    !event.altKey &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.shiftKey
                ) {
                    event.preventDefault();
                    navigation.navigate(href);
                }
            }}
        />
    );
}

/** Navigates to a destination or downloads an attachment through the scoped host capability. */
export function Link({ to, download, children }: { to: string; download?: string; children?: ReactNode }) {
    const files = useContext(FileRequestContext);
    const [error, setError] = useState<string>();

    /** Matches FileViewer filename handling and preserves host notification ownership. */
    async function downloadAttachment(name: string) {
        setError(undefined);

        // Keep unreported failures visible without duplicating host notifications.
        try {
            if (!files) throw new Error('Downloads require the Solution runtime');
            const filename = name.replace(/[/\\\p{Cc}]/gu, '_').slice(0, 256) || 'attachment';
            await files.download(to, filename);
        } catch (failure) {
            if (!(failure instanceof ReportedError)) {
                setError(failure instanceof Error ? failure.message : 'Download failed');
            }
        }
    }

    // Download links use the host capability instead of navigating inside the sandbox.
    return (
        <>
            <AstryxLink
                as={NavigationLink}
                href={to}
                download={download}
                onClick={(event) => {
                    if (download === undefined) return;
                    event.preventDefault();
                    void downloadAttachment(download);
                }}
            >
                {children}
            </AstryxLink>
            {error && <Text role="alert">{error}</Text>}
        </>
    );
}
