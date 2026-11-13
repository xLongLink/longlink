import { cn } from 'cn';
import { NativeText } from './NativeText';
import { ArrowUpRight } from 'lucide-react';
import type { TextProps } from './typography';
import type { ComponentPropsWithRef } from 'react';
import { buttonVariants } from '@/components/shadcn/button';
import { Link as RouterLink, useInRouterContext } from 'react-router';

type NativeAnchorProps = Omit<ComponentPropsWithRef<'a'>, 'download'> & { download?: string | boolean };

/** Routes trusted application links without restricting native external and download destinations. */
export function NativeNavigationLink({ href, download, target, rel, ...props }: NativeAnchorProps) {
    const router = useInRouterContext();
    const external = href !== undefined && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href.trim());

    const relationship =
        target === '_blank' ? [...new Set(`${rel ?? ''} noopener noreferrer`.trim().split(/\s+/))].join(' ') : rel;

    // React Router preserves modified clicks; native anchors own external navigation and downloads.
    if (router && href !== undefined && !external && download === undefined) {
        return <RouterLink {...props} to={href} target={target} rel={relationship} />;
    }

    return <a {...props} href={href} download={download} target={target} rel={relationship} />;
}

/** Adds native typography to trusted application links. */
export function NativeLink({
    href,
    target,
    rel,
    download,
    children,
    type = 'body',
    color = 'inherit',
    weight,
    size,
    hasUnderline = false,
    isExternalLink = false,
    className,
    ...props
}: Omit<NativeAnchorProps, 'type' | 'color'> &
    Pick<TextProps, 'type' | 'color' | 'weight' | 'size'> & {
        hasUnderline?: boolean;
        isExternalLink?: boolean;
    }) {
    const linkTarget = isExternalLink ? '_blank' : target;

    const content = (
        <NativeText type={type} color={color} weight={weight} size={size}>
            {children}
        </NativeText>
    );

    const attributes = {
        ...props,
        target: linkTarget,
        rel,
        download,
        className: cn(
            buttonVariants({ variant: 'link', size: null }),
            'align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50',
            hasUnderline && 'underline',
            className
        ),
    };

    return (
        <NativeNavigationLink {...attributes} href={href}>
            {content}
            {isExternalLink && <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />}
            {isExternalLink && <span className="sr-only">(opens in new tab)</span>}
        </NativeNavigationLink>
    );
}
