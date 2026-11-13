import { cn } from 'cn';
import { NavigationLink } from '../ui/Link';
import { Card as Surface } from '@/components/shadcn/card';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

/** Surface gestures must not steal nested controls, portal events, or text selection. */
function isSurfaceActivation(event: MouseEvent<HTMLElement>) {
    const root = event.currentTarget;
    const target = event.target;

    if (event.defaultPrevented || !(target instanceof Element) || !root.contains(target)) return false;

    if (root.closest('[inert]')) return false;

    // A nested card or control owns its event, including disabled and editable controls.
    const control = target.closest(
        'a,button,input,select,textarea,summary,label,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="tab"],[role="menuitem"],[role="option"],[role="combobox"],[role="listbox"],[role="slider"],[role="spinbutton"],[tabindex],[data-pressable-container]'
    );

    if (control && control !== root && root.contains(control)) return false;

    const selection = root.ownerDocument.getSelection();

    return !selection || selection.isCollapsed || !root.contains(selection.anchorNode);
}

/** Activates the card's native anchor synchronously, preserving the user's navigation gesture. */
function activateLink(event: MouseEvent<HTMLElement>) {
    if (event.defaultPrevented) return;
    event.preventDefault();

    // Use the resolved, validated destination on the primary anchor rather than the raw card href.
    const anchor = event.currentTarget.querySelector<HTMLAnchorElement>(':scope > a[href]');

    if (!anchor) return;

    // Open during the original middle-button event so the browser retains its tab and focus policy.
    if (event.button === 1) {
        const destination = new URL(anchor.href);

        if (destination.protocol !== 'http:' && destination.protocol !== 'https:') return;

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
            shiftKey: event.shiftKey
        })
    );
}

type InteractiveCardProps = {
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

/** Keeps native controls separate from card content, with selection taking priority over actions and links. */
export function InteractiveCard({
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
    children,
    width,
    height,
    maxWidth,
    minHeight,
    inert,
    'aria-hidden': ariaHidden
}: InteractiveCardProps) {
    const mode =
        onChange !== undefined
            ? 'selection'
            : onClick !== undefined
              ? 'action'
              : href !== undefined
                ? 'link'
                : undefined;

    const blocked = isDisabled || inert;

    const style: CSSProperties & { '--view-card-padding': string } = {
        width,
        height,
        maxWidth,
        minHeight,
        padding: 'var(--view-card-padding)',
        '--view-card-padding': `var(--spacing-${String(padding).replace('.', '-')})`
    };

    // The surface forwards only its own gestures; native controls supply keyboard and accessibility semantics.
    return (
        <Surface
            className={cn(
                'view-card block gap-0',
                variant === 'transparent' && 'bg-transparent ring-0',
                variant === 'muted' && 'bg-muted ring-0'
            )}
            data-variant={variant}
            data-mode={mode}
            data-pressable-container={mode ? '' : undefined}
            data-selected={mode === 'selection' && isSelected ? '' : undefined}
            data-disabled={mode && isDisabled ? '' : undefined}
            data-clipped={isClipped ? '' : undefined}
            data-scrollable={height !== undefined && height !== 'auto' ? '' : undefined}
            inert={inert}
            aria-hidden={ariaHidden}
            style={style}
            onClick={
                mode && !blocked
                    ? (event) => {
                          if (event.button !== 0 || !isSurfaceActivation(event)) return;

                          if (mode === 'selection') onChange?.(!isSelected);
                          else if (mode === 'action') onClick?.(event);
                          else activateLink(event);
                      }
                    : undefined
            }
            onMouseUp={
                mode === 'link' && !blocked
                    ? (event) => {
                          if (event.button === 1 && isSurfaceActivation(event)) activateLink(event);
                      }
                    : undefined
            }
        >
            {mode === 'selection' ? (
                <input
                    className="view-card-control"
                    type="checkbox"
                    aria-label={label}
                    aria-disabled={isDisabled || undefined}
                    checked={isSelected}
                    onClick={
                        blocked
                            ? (event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                              }
                            : undefined
                    }
                    onChange={() => {
                        if (!blocked) onChange?.(!isSelected);
                    }}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing || event.keyCode === 229) return;

                        if (blocked && (event.key === ' ' || event.key === 'Enter')) event.preventDefault();
                        else if (event.key === 'Enter') {
                            event.preventDefault();
                            onChange?.(!isSelected);
                        }
                    }}
                />
            ) : mode === 'action' ? (
                <button
                    className="view-card-control"
                    type="button"
                    aria-label={label}
                    aria-disabled={isDisabled || undefined}
                    onClick={(event) => {
                        if (blocked) {
                            event.preventDefault();
                            event.stopPropagation();
                        } else onClick?.(event);
                    }}
                    onKeyDown={
                        blocked
                            ? (event) => {
                                  if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
                              }
                            : undefined
                    }
                />
            ) : mode === 'link' ? (
                <NavigationLink
                    className="view-card-control"
                    href={blocked ? undefined : href}
                    target={blocked ? undefined : target}
                    role="link"
                    tabIndex={0}
                    aria-label={label}
                    aria-disabled={isDisabled || undefined}
                    onClick={
                        blocked
                            ? (event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                              }
                            : undefined
                    }
                    onKeyDown={
                        blocked
                            ? (event) => {
                                  if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
                              }
                            : undefined
                    }
                />
            ) : null}
            {children}
        </Surface>
    );
}
