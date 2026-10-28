import { NavigationLink } from './Link';
import type { MouseEvent, ReactNode } from 'react';
import { LinkProvider } from '@astryxdesign/core/Link';
import { Card as AstryxCard } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { hasInteractiveAncestor, hasTextSelection } from '@astryxdesign/core/hooks';

/** Activates the card's native anchor synchronously, preserving the user's navigation gesture. */
function activateLink(event: MouseEvent<HTMLElement>) {
    if (event.defaultPrevented) return;
    event.preventDefault();

    // Use the resolved, validated destination on the primary anchor rather than the raw card href.
    const anchor = event.currentTarget.querySelector<HTMLAnchorElement>(':scope > a[href]');

    if (!anchor) return;

    // Open during the original middle-button event so the browser retains its tab and focus policy.
    if (event.button === 1) {
        window.open(anchor.href, '_blank', 'noopener,noreferrer');

        return;
    }

    // Forward surface clicks to the primary link without crossing the asynchronous host bridge.
    anchor.dispatchEvent(
        new window.MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            button: event.button,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
        })
    );
}

type CardProps = {
    /** Content rendered inside the card. */
    children?: ReactNode;
    /** Inner spacing using the theme spacing scale. */
    padding?: 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
    /** Clips full-bleed content to the card's rounded edges. */
    isClipped?: boolean;
    /** Background color variant, independent of the interaction mode. */
    variant?: 'default' | 'transparent' | 'muted';
    /** Card width; numbers are pixels and strings are CSS sizes. */
    width?: number | string;
    /** Card height; numbers are pixels and strings are CSS sizes. */
    height?: number | string;
    /** Maximum card width. */
    maxWidth?: number | string;
    /** Minimum card height. */
    minHeight?: number | string;
    /** Makes the card and its descendants non-interactive. */
    inert?: boolean;
    /** Accessible by default; set true only for decorative or redundant, non-interactive content. */
    'aria-hidden'?: boolean | 'true' | 'false';
    /** Accessible label for interactive cards; supply a descriptive label. */
    label?: string;
    /** Makes the card clickable when its surface is activated; nested controls act independently. */
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    /** Solution-relative destination or HTTP(S) URL to open in a new tab when no selection callback is supplied. */
    href?: string;
    /** Native link target; isolated Views use the current Solution for relative paths and a new tab for HTTP(S) URLs. */
    target?: string;
    /** Disables activation of an interactive card. */
    isDisabled?: boolean;
    /** Selection state; supply onChange to let users toggle it. */
    isSelected?: boolean;
    /** Makes the card selectable and receives its next selection state; takes priority over onClick and href. */
    onChange?: (isSelected: boolean) => void;
};

/** Infers the Astryx card from one shared set of props, giving selection priority over activation. */
export function Card({
    label = 'Card',
    padding = 4,
    isClipped = false,
    variant = 'default',
    onClick,
    href,
    target = '_self',
    isDisabled = false,
    isSelected = false,
    onChange,
    ...props
}: CardProps) {
    // Use Astryx's controlled selection behavior whenever a selection callback is supplied.
    if (onChange !== undefined) {
        return (
            <SelectableCard
                {...props}
                className={isClipped ? 'overflow-hidden' : undefined}
                padding={padding}
                variant={variant}
                label={label}
                isSelected={isSelected}
                onChange={onChange}
                isDisabled={isDisabled}
            />
        );
    }

    // Delegate actions and navigation to Astryx's clickable card.
    if (onClick !== undefined || href !== undefined) {
        return (
            <LinkProvider component={NavigationLink}>
                <ClickableCard
                    {...props}
                    className={isClipped ? 'overflow-hidden' : undefined}
                    padding={padding}
                    variant={variant}
                    label={label}
                    onClick={href !== undefined ? activateLink : onClick}
                    onClickCapture={(event) => {
                        // Run surface actions once for both pointer and keyboard activation of the primary link.
                        if (!isDisabled && event.target === event.currentTarget.querySelector(':scope > a')) {
                            onClick?.(event);
                        }
                    }}
                    onMouseUpCapture={(event) => {
                        // Proxy middle-clicks before Astryx's window.open fallback, leaving nested controls independent.
                        if (
                            isDisabled ||
                            href === undefined ||
                            event.button !== 1 ||
                            !(event.target instanceof Element) ||
                            hasInteractiveAncestor(event.target, event.currentTarget) ||
                            hasTextSelection(event.currentTarget)
                        )
                            return;

                        event.stopPropagation();
                        activateLink(event);
                    }}
                    href={href}
                    target={target}
                    isDisabled={isDisabled}
                />
            </LinkProvider>
        );
    }

    // Keep content-only cards non-interactive.
    return (
        <AstryxCard
            {...props}
            className={isClipped ? 'overflow-hidden' : undefined}
            padding={padding}
            variant={variant}
        />
    );
}
