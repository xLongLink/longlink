import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

type ScrollspyProps = {
    children: ReactNode;
    targetRef?: RefObject<HTMLElement | Document | null | undefined>;
    onUpdate?: (id: string) => void;
    offset?: number;
    smooth?: boolean;
    className?: string;
    dataAttribute?: string;
    history?: boolean | 'push';
    initialHash?: string;
};

type Section = { anchor: HTMLAnchorElement; heading: HTMLElement; id: string };

/** Tracks section visibility and handles in-page navigation for the supplied links. */
export function Scrollspy({
    children,
    targetRef,
    onUpdate,
    className,
    offset = 0,
    smooth = true,
    dataAttribute = 'scrollspy',
    history = true,
    initialHash
}: ScrollspyProps) {
    const selfRef = useRef<HTMLDivElement>(null);
    const activeId = useRef<string | null>(null);
    const onUpdateRef = useRef(onUpdate);

    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    // Resolve DOM references only after mounting or during an interaction.
    const getSections = useCallback((): Section[] => {
        const anchors = selfRef.current?.querySelectorAll<HTMLAnchorElement>(`a[data-${dataAttribute}-anchor]`);
        return Array.from(anchors ?? []).flatMap((anchor) => {
            const id = anchor.getAttribute(`data-${dataAttribute}-anchor`);
            const heading = id ? document.getElementById(id) : null;
            return id && heading ? [{ anchor, heading, id }] : [];
        });
    }, [dataAttribute]);

    const getViewport = useCallback(() => {
        const target = targetRef?.current;
        if (!target || target === document) return null;
        const element = target as HTMLElement;
        return element.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? element;
    }, [targetRef]);

    const getOffset = useCallback(
        ({ anchor, heading }: Section) => {
            const linkOffset = Number.parseFloat(anchor.getAttribute(`data-${dataAttribute}-offset`) ?? '');
            const margin = Number.parseFloat(window.getComputedStyle(heading).scrollMarginTop) || 0;
            return margin + (Number.isFinite(linkOffset) ? linkOffset : offset);
        },
        [dataAttribute, offset]
    );

    const setActive = useCallback(
        (id: string, source: 'track' | 'click' | 'hash' = 'track') => {
            const changed = activeId.current !== id;

            if (changed || source !== 'track') {
                selfRef.current?.querySelectorAll(`a[data-${dataAttribute}-anchor]`).forEach((anchor) => {
                    if (anchor.getAttribute(`data-${dataAttribute}-anchor`) === id) {
                        anchor.setAttribute('data-active', 'true');
                        anchor.setAttribute('aria-current', 'location');
                    } else {
                        anchor.removeAttribute('data-active');
                        anchor.removeAttribute('aria-current');
                    }
                });
            }

            activeId.current = id;

            // Tracking replaces history; push mode records explicit navigation only.
            const hash = `#${encodeURIComponent(id)}`;
            if (source !== 'hash' && window.location.hash !== hash) {
                if (history === 'push' && source === 'click') {
                    window.history.pushState(window.history.state, '', hash);
                } else if (history === true && (changed || source === 'click')) {
                    window.history.replaceState(window.history.state, '', hash);
                }
            }
            if (changed) onUpdateRef.current?.(id);
        },
        [dataAttribute, history]
    );

    const syncGeometry = useCallback(() => {
        const sections = getSections();
        if (!sections.length) return;

        // Compare heading positions against the actual scrolling viewport.
        const viewport = getViewport();
        const top = viewport ? viewport.getBoundingClientRect().top + viewport.clientTop : 0;
        const scrollTop = viewport ? viewport.scrollTop : window.scrollY || document.documentElement.scrollTop;
        const clientHeight = viewport ? viewport.clientHeight : window.innerHeight;
        const scrollHeight = viewport ? viewport.scrollHeight : document.documentElement.scrollHeight;
        let selected = sections[0]!;
        for (const section of sections) {
            if (section.heading.getBoundingClientRect().top - top - getOffset(section) <= 1) {
                selected = section;
            }
        }
        if (scrollHeight > clientHeight && scrollTop + clientHeight >= scrollHeight - 2) {
            selected = sections[sections.length - 1]!;
        }
        setActive(selected.id);
    }, [getSections, getViewport, getOffset, setActive]);

    useEffect(() => {
        let frame: number | undefined;
        const schedule = () => {
            if (frame !== undefined) return;
            frame = window.requestAnimationFrame(() => {
                frame = undefined;
                syncGeometry();
            });
        };
        const syncHash = (hash: string) => {
            const section = getSections().find(
                (item) => hash === `#${item.id}` || hash === `#${encodeURIComponent(item.id)}`
            );
            if (!section) return false;
            setActive(section.id, 'hash');
            return true;
        };
        const onHistory = () => {
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            frame = undefined;
            if (!syncHash(window.location.hash)) syncGeometry();
        };
        const onScroll = (event: Event) => {
            const viewport = getViewport();
            if (!viewport || event.target === viewport) schedule();
        };

        // Hash synchronization selects without scrolling or moving focus.
        if (!syncHash(initialHash ?? window.location.hash)) syncGeometry();

        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', schedule);
        window.addEventListener('hashchange', onHistory);
        window.addEventListener('popstate', onHistory);
        return () => {
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', schedule);
            window.removeEventListener('hashchange', onHistory);
            window.removeEventListener('popstate', onHistory);
        };
    }, [getSections, getViewport, initialHash, setActive, syncGeometry]);

    useEffect(() => {
        // Refresh changed navigation children without repeating update callbacks.
        if (!activeId.current) return;
        if (getSections().some((section) => section.id === activeId.current)) {
            setActive(activeId.current, 'hash');
        } else {
            syncGeometry();
        }
    }, [children, getSections, setActive, syncGeometry]);

    return (
        <div
            data-slot="scrollspy"
            className={className}
            ref={selfRef}
            onClick={(event) => {
                if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.shiftKey
                ) {
                    return;
                }

                // Intercept only ordinary links owned by this navigation.
                const anchor =
                    event.target instanceof Element
                        ? event.target.closest<HTMLAnchorElement>(`a[data-${dataAttribute}-anchor]`)
                        : null;
                if (!anchor || !event.currentTarget.contains(anchor)) return;
                if (anchor.hasAttribute('target') || anchor.hasAttribute('download')) return;
                const id = anchor.getAttribute(`data-${dataAttribute}-anchor`);
                const heading = id ? document.getElementById(id) : null;

                if (!id || !heading) return;
                event.preventDefault();

                const viewport = getViewport();
                const top = viewport ? viewport.getBoundingClientRect().top + viewport.clientTop : 0;
                const scrollTop = viewport ? viewport.scrollTop : window.scrollY || document.documentElement.scrollTop;
                const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                (viewport ?? window).scrollTo({
                    top: scrollTop + heading.getBoundingClientRect().top - top - getOffset({ anchor, heading, id }),
                    behavior: smooth && !reducedMotion ? 'smooth' : 'instant'
                });

                // Preserve author-supplied focusability when moving sequential focus.
                const needsTabIndex =
                    !heading.hasAttribute('tabindex') && heading.tabIndex < 0 && !heading.isContentEditable;
                if (needsTabIndex) heading.setAttribute('tabindex', '-1');
                heading.focus({ preventScroll: true });
                setActive(id, 'click');
            }}
        >
            {children}
        </div>
    );
}
