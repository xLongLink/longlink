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

/** Navigates within the Solution or opens an external HTTP(S) URL in a new tab. */
export function Link({ to, children }: { to: string; children?: ReactNode }) {
    // Share native anchor behavior with navigable cards.
    return (
        <AstryxLink as={NavigationLink} href={to}>
            {children}
        </AstryxLink>
    );
}
