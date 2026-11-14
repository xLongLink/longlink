import { cn } from 'cn';
import { resolveNavigationUrl } from '@/lib/url';
import { LinkNavigationContext } from './contexts';
import { buttonVariants } from '@/components/shadcn/button';
import { useContext, type ComponentPropsWithRef } from 'react';

/** Preserves native link gestures while routing ordinary internal clicks through the host. */
export function NavigationLink({ href, target, rel, download, onClick, ...props }: ComponentPropsWithRef<'a'>) {
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
            download={navigation ? undefined : download}
            target={navigation && !internalHref ? '_blank' : target}
            rel={
                navigation || target === '_blank'
                    ? [...new Set(`${rel ?? ''} noopener noreferrer`.trim().split(/\s+/))].join(' ')
                    : rel
            }
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

/** Adds link styling while preserving native anchor props, content and scoped navigation. */
export function Link({ className, ...props }: Omit<ComponentPropsWithRef<'a'>, 'download'>) {
    return (
        <NavigationLink
            {...props}
            className={cn(
                buttonVariants({ variant: 'link', size: null }),
                'align-baseline whitespace-normal',
                className
            )}
        />
    );
}
