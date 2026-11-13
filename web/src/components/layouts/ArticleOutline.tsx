import { useLocation } from 'react-router';
import { useEffect, useRef, useState, type MouseEvent } from 'react';

export type ArticleOutlineItem = { id: string; label: string; level: number };

/** Tracks the authored article headings in the page's viewport scroll root. */
export function ArticleOutline({ items }: { items: readonly ArticleOutlineItem[] }) {
    const { hash, key } = useLocation();
    const navigation = useRef<{ cancel: () => void; hash: string } | null>(null);
    const synchronize = useRef<(() => void) | null>(null);

    const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id);

    // Follow live heading positions, including short final sections at the document boundary.
    useEffect(() => {
        const frame = { id: 0 };

        const update = () => {
            if (navigation.current) return;
            let nextId: string | undefined = items[0]?.id;

            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
                nextId = items.at(-1)?.id;
            } else {
                for (const item of items) {
                    const heading = document.getElementById(item.id);

                    if (!heading) continue;
                    const margin = Number.parseFloat(window.getComputedStyle(heading).scrollMarginTop) || 0;

                    if (heading.getBoundingClientRect().top > margin + 1) break;
                    nextId = item.id;
                }
            }

            setActiveId(nextId);
        };

        const onScroll = () => {
            if (!frame.id) {
                frame.id = window.requestAnimationFrame(() => {
                    frame.id = 0;
                    update();
                });
            }
        };

        const onHashChange = (event: Event) => {
            if (event.type === 'hashchange' && window.location.hash === navigation.current?.hash) return;
            navigation.current?.cancel();
            window.cancelAnimationFrame(frame.id);
            frame.id = 0;

            const target = items.find(
                (item) =>
                    window.location.hash === `#${item.id}` || window.location.hash === `#${encodeURIComponent(item.id)}`
            );

            if (target) setActiveId(target.id);
            else update();
        };

        // Honor direct fragments and router navigation without replacing native history semantics.
        const target = items.find((item) => hash === `#${item.id}` || hash === `#${encodeURIComponent(item.id)}`);
        frame.id = window.requestAnimationFrame(() => {
            frame.id = 0;

            if (navigation.current) return;

            if (target) setActiveId(target.id);
            else update();
        });
        synchronize.current = update;
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        window.addEventListener('hashchange', onHashChange);
        window.addEventListener('popstate', onHashChange);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            window.removeEventListener('hashchange', onHashChange);
            window.removeEventListener('popstate', onHashChange);
            window.cancelAnimationFrame(frame.id);
            synchronize.current = null;
            navigation.current?.cancel();
        };
    }, [items, hash, key]);

    // Keep modified clicks native; ordinary fragment navigation also moves sequential focus.
    function navigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
        )
            return;
        const heading = document.getElementById(id);

        if (!heading) return;
        event.preventDefault();
        navigation.current?.cancel();

        // Hold the selected destination until this scroll settles or the reader takes over.
        let timer = 0;

        const cleanup = () => {
            window.clearTimeout(timer);
            window.removeEventListener('scrollend', onSettle);
            window.removeEventListener('wheel', onInterrupt);
            window.removeEventListener('touchmove', onInterrupt);
            window.removeEventListener('keydown', onKeyDown);
            navigation.current = null;
        };

        const onSettle = () => {
            cleanup();
            setActiveId(id);
        };

        const onInterrupt = () => {
            cleanup();
            synchronize.current?.();
        };

        const onKeyDown = (keyEvent: KeyboardEvent) => {
            if (
                !keyEvent.defaultPrevented &&
                ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'].includes(keyEvent.key)
            ) {
                onInterrupt();
            }
        };

        const destinationHash = `#${encodeURIComponent(id)}`;
        navigation.current = { cancel: cleanup, hash: destinationHash };
        window.addEventListener('scrollend', onSettle, { once: true });
        window.addEventListener('wheel', onInterrupt, { passive: true });
        window.addEventListener('touchmove', onInterrupt, { passive: true });
        window.addEventListener('keydown', onKeyDown);
        timer = window.setTimeout(onSettle, 1200);
        setActiveId(id);
        window.history.pushState(window.history.state, '', destinationHash);
        heading.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'start',
        });
        heading.focus({ preventScroll: true });

        if (document.activeElement !== heading && !heading.hasAttribute('tabindex')) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
        }
    }

    return (
        <aside className="article-outline" aria-label="On this page">
            <h2 className="article-outline-title">On this page</h2>
            <nav aria-label="On this page">
                <ul>
                    {items.map((item) => (
                        <li key={item.id}>
                            <a
                                href={`#${encodeURIComponent(item.id)}`}
                                data-level={item.level}
                                aria-current={activeId === item.id ? 'location' : undefined}
                                onClick={(event) => navigate(event, item.id)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === ' ' &&
                                        !event.altKey &&
                                        !event.ctrlKey &&
                                        !event.metaKey &&
                                        !event.shiftKey
                                    ) {
                                        event.preventDefault();
                                        event.currentTarget.click();
                                    }
                                }}
                            >
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
