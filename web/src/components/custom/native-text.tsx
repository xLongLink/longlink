import { cn } from 'cn';
import { TypographyTooltip } from './typography-tooltip';
import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type Ref } from 'react';

export type NativeTextProps = Omit<HTMLAttributes<HTMLElement>, 'color'> & {
    as?: 'span' | 'p' | 'div' | 'label' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    maxLines?: number;
    hasTruncateTooltip?: boolean | 'above' | 'below' | 'start' | 'end';
    ref?: Ref<HTMLElement>;
};

/** Displays native text with optional truncation details, inheriting surrounding typography. */
export function NativeText({
    children,
    as: Component = 'span',
    maxLines = 0,
    hasTruncateTooltip = true,
    className,
    style,
    ref,
    ...props
}: NativeTextProps) {
    const elementRef = useRef<HTMLElement | null>(null);
    const [overflow, setOverflow] = useState({ truncated: false, text: '' });

    // Keep the measurement anchor and the caller's ref on the same native element.
    const mergedRef = useCallback(
        (element: HTMLElement | null) => {
            elementRef.current = element;

            // React refs are either callbacks or mutable ref objects.
            // oxlint-disable-next-line anti-slop/no-runtime-typeof
            if (typeof ref === 'function') {
                const cleanup = ref(element);

                return () => {
                    elementRef.current = null;

                    if (cleanup) cleanup();
                    else ref(null);
                };
            }

            if (ref) ref.current = element;
        },
        [ref]
    );

    // Keep truncation details current when either the available space or the text changes.
    useEffect(() => {
        const element = elementRef.current;

        if (!element || maxLines <= 0 || hasTruncateTooltip === false) return;

        const measure = () => {
            let contentHeight = element.scrollHeight;

            if (maxLines > 1) {
                const range = element.ownerDocument.createRange();
                range.selectNodeContents(element);

                if ('getBoundingClientRect' in range) {
                    contentHeight = range.getBoundingClientRect().height;
                }

                range.detach();
            }

            const truncated =
                maxLines === 1 ? element.scrollWidth > element.offsetWidth : contentHeight > element.offsetHeight;

            const text = element.textContent ?? '';
            setOverflow((previous) =>
                previous.truncated === truncated && previous.text === text ? previous : { truncated, text }
            );
        };

        measure();
        const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
        resizeObserver?.observe(element);
        const mutationObserver = new MutationObserver(measure);
        mutationObserver.observe(element, { childList: true, characterData: true, subtree: true });

        return () => {
            resizeObserver?.disconnect();
            mutationObserver.disconnect();
        };
    }, [maxLines, hasTruncateTooltip, Component]);

    // Keep clipping on the semantic element rather than introducing a wrapper.
    const content = (
        <Component
            {...props}
            ref={mergedRef}
            className={cn(maxLines === 1 && 'block truncate', maxLines > 1 && 'line-clamp-1', className)}
            style={maxLines > 1 ? { WebkitLineClamp: maxLines, ...style } : style}
        >
            {children}
        </Component>
    );

    return (
        <TypographyTooltip
            enabled={maxLines > 0 && hasTruncateTooltip !== false && overflow.truncated}
            content={overflow.text}
            placement={hasTruncateTooltip === true || hasTruncateTooltip === false ? 'above' : hasTruncateTooltip}
        >
            {content}
        </TypographyTooltip>
    );
}
