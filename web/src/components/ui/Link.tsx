import { useDownload } from './preview';
import { Text } from '@astryxdesign/core/Text';
import { resolveNavigationUrl } from '@/lib/url';
import { LinkNavigationContext } from './contexts';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { useContext, type ComponentPropsWithRef, type ReactNode } from 'react';

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
    const attachment = useDownload();

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
                    void attachment.download(to, download);
                }}
            >
                {children}
            </AstryxLink>
            {attachment.error && <Text role="alert">{attachment.error}</Text>}
        </>
    );
}
