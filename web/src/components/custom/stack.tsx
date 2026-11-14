import { spacing } from './layout';
import type { Spacing } from './types';
import { useCallback, useState, type ReactNode } from 'react';

type StackProps = {
    children?: ReactNode;
    /** Container width; numbers are pixels and strings are CSS sizes. */
    width?: number | string;
    /** Container height; numbers are pixels and strings are CSS sizes. */
    height?: number | string;
    /** Maximum container width; numbers are pixels and strings are CSS sizes. */
    maxWidth?: number | string;
    /** Minimum container height; numbers are pixels and strings are CSS sizes. */
    minHeight?: number | string;
    /** Spacing between items. */
    gap?: Spacing;
    padding?: Spacing;
    /** Horizontal padding, overriding padding on the inline axis. */
    paddingInline?: Spacing;
    /** Vertical padding, overriding padding on the block axis. */
    paddingBlock?: Spacing;
    /** Optional muted surface background; omitted stacks remain transparent. */
    background?: 'muted';
    direction?: 'horizontal' | 'vertical';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'center' | 'end' | 'stretch';
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
};

/** Arranges View content using the LongLink spacing scale. */
export function Stack({ background, ...props }: StackProps) {
    // Resolve logical padding independently so axis overrides retain precedence.
    return (
        <div
            className="flex flex-col"
            style={{
                width: props.width,
                height: props.height,
                maxWidth: props.maxWidth,
                minHeight: props.minHeight,
                gap: spacing(props.gap ?? 3),
                paddingInline: spacing(props.paddingInline ?? props.padding ?? 0),
                paddingBlock: spacing(props.paddingBlock ?? props.padding ?? 0),
                backgroundColor: background === 'muted' ? 'var(--muted)' : undefined,
                flexDirection: props.direction === 'horizontal' ? 'row' : 'column',
                justifyContent: {
                    start: 'flex-start',
                    center: 'center',
                    end: 'flex-end',
                    between: 'space-between',
                    around: 'space-around',
                    evenly: 'space-evenly'
                }[props.justify ?? 'start'],
                alignItems:
                    props.align === 'start'
                        ? 'flex-start'
                        : props.align === 'end'
                          ? 'flex-end'
                          : (props.align ?? 'stretch'),
                flexWrap: props.wrap ?? 'nowrap'
            }}
        >
            {props.children}
        </div>
    );
}

/** Controls how one item participates in its surrounding Stack. */
export function StackItem(props: {
    /** Content rendered inside the stack item. */
    children?: ReactNode;
    size?: 'static' | 'fill';
    isScrollable?: boolean;
    /** Overrides this item's cross-axis alignment; omitted values inherit the parent alignment. */
    crossAlignSelf?: 'start' | 'center' | 'end' | 'stretch';
}) {
    const [overflows, setOverflows] = useState(false);

    // Name scroll regions only while overflowing, including changes within retained children.
    const ref = useCallback(
        (element: HTMLDivElement | null) => {
            if (!element || !props.isScrollable) return;

            const lifetime = new AbortController();

            const measure = () => {
                if (lifetime.signal.aborted || !element.clientWidth || !element.clientHeight) return;

                setOverflows(
                    element.scrollHeight - element.clientHeight > 1 || element.scrollWidth - element.clientWidth > 1
                );
            };

            const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);

            const observeChildren = () => {
                resize?.disconnect();
                resize?.observe(element);

                for (const child of element.children) resize?.observe(child);

                measure();
            };

            const mutations = new MutationObserver(observeChildren);
            mutations.observe(element, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['class', 'dir', 'hidden', 'style']
            });
            observeChildren();
            window.addEventListener('resize', measure);
            window.visualViewport?.addEventListener('resize', measure);
            element.addEventListener('load', measure, true);
            element.addEventListener('transitionend', measure);
            element.addEventListener('animationend', measure);
            document.fonts?.addEventListener?.('loadingdone', measure);
            void document.fonts?.ready.then(measure);

            return () => {
                lifetime.abort();
                resize?.disconnect();
                mutations.disconnect();
                window.removeEventListener('resize', measure);
                window.visualViewport?.removeEventListener('resize', measure);
                element.removeEventListener('load', measure, true);
                element.removeEventListener('transitionend', measure);
                element.removeEventListener('animationend', measure);
                document.fonts?.removeEventListener?.('loadingdone', measure);
            };
        },
        [props.isScrollable]
    );

    // Preserve intrinsic flex bases: fill grows without forcing an equal zero basis.
    return (
        <div
            ref={ref}
            className="view-stack-item min-h-0 min-w-0"
            role={props.isScrollable && overflows ? 'group' : undefined}
            aria-label={props.isScrollable && overflows ? 'Content' : undefined}
            style={{
                flexGrow: props.size === 'fill' ? 1 : 0,
                flexShrink: props.size === 'fill' ? undefined : 0,
                overflow: props.isScrollable ? 'auto' : undefined,
                alignSelf:
                    props.crossAlignSelf === 'start'
                        ? 'flex-start'
                        : props.crossAlignSelf === 'end'
                          ? 'flex-end'
                          : props.crossAlignSelf
            }}
        >
            {props.children}
        </div>
    );
}
