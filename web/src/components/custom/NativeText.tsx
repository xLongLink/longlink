import type { TextProps } from './typography';
import { TypographyTooltip } from './TypographyTooltip';
import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type Ref } from 'react';

export type NativeTextProps = Omit<TextProps, 'as'> &
    Omit<HTMLAttributes<HTMLElement>, keyof TextProps> & {
        as?: TextProps['as'] | 'h4' | 'h5' | 'h6';
        ref?: Ref<HTMLElement>;
    };

/** Displays trusted native text with typography and optional truncation details. */
export function NativeText({
    children,
    type = 'body',
    color = type === 'supporting' ? 'secondary' : type === 'inherit' ? 'inherit' : 'primary',
    size,
    weight,
    display = 'inline',
    as: Component = 'span',
    maxLines = 0,
    hasTruncateTooltip = true,
    wordBreak = maxLines === 1 ? 'break-all' : 'break-word',
    textWrap,
    justify = 'start',
    hasCapsize = false,
    hasStrikethrough = false,
    hasTabularNumbers = false,
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

    // Preserve single-line clipping and the capsize override of multi-line display.
    const content = (
        <Component
            {...props}
            ref={mergedRef}
            className={className ? `view-text ${className}` : 'view-text'}
            data-type={type}
            data-color={color}
            data-size={size}
            data-weight={weight}
            data-display={maxLines > 0 || hasCapsize ? 'block' : display}
            data-clamp={maxLines === 1 ? 'single' : maxLines > 1 ? 'multiple' : undefined}
            data-word-break={maxLines > 0 ? wordBreak : undefined}
            data-text-wrap={textWrap}
            data-justify={justify === 'start' ? undefined : justify}
            data-capsize={hasCapsize || undefined}
            data-strikethrough={hasStrikethrough || undefined}
            data-tabular={hasTabularNumbers || undefined}
            style={maxLines > 1 ? { ...style, WebkitLineClamp: maxLines } : style}
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
