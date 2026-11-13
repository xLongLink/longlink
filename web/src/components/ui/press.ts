import { useEffect, useRef, type RefObject } from 'react';

const boundary = '[role="group"], [role="menu"], [role="dialog"], dialog';

const disabled = ':disabled, [aria-disabled="true"]';

type GroupPress = {
    id: number;
    pointer: string;
    x: number;
    y: number;
    active: boolean;
    target: HTMLElement | null;
    timer?: ReturnType<typeof setTimeout>;
    actions: { element: HTMLElement; rect: DOMRect; owned: boolean }[];
};

/** Tracks a held touch or pen across grouped actions while leaving scrolling to the browser. */
export function useGroupPress(ref: RefObject<HTMLElement | null>, enabled: boolean) {
    const suppression = useRef(0);
    const session = useRef<GroupPress | null>(null);

    useEffect(() => {
        const element = ref.current;

        if (!element || !enabled) return;
        const group = element;
        const document = group.ownerDocument;
        const view = document.defaultView;

        if (!view) return;
        const window = view;

        suppression.current = 0;

        // Disabled neighbours participate in hit testing so expanded targets cannot reach through them.
        function targetAt(x: number, y: number) {
            const press = session.current;

            if (!press) return null;
            let target: HTMLElement | null = null;
            let nearest = Number.POSITIVE_INFINITY;
            let owned = false;

            for (const action of press.actions) {
                const { element, rect } = action;
                const expansionX = press.pointer === 'touch' ? Math.max(0, (44 - rect.width) / 2) : 0;
                const expansionY = press.pointer === 'touch' ? Math.max(0, (44 - rect.height) / 2) : 0;

                if (
                    x < rect.left - expansionX ||
                    x > rect.right + expansionX ||
                    y < rect.top - expansionY ||
                    y > rect.bottom + expansionY
                )
                    continue;

                const distance = Math.hypot(
                    Math.max(rect.left - x, 0, x - rect.right),
                    Math.max(rect.top - y, 0, y - rect.bottom)
                );

                if (distance < nearest) {
                    nearest = distance;
                    target = element;
                    owned = action.owned;
                }
            }

            return !owned || target?.matches(disabled) ? null : target;
        }

        function highlight(target: HTMLElement | null) {
            const press = session.current;

            if (!press || press.target === target) return;
            press.target?.removeAttribute('data-group-pressed');
            press.target = target;
            target?.setAttribute('data-group-pressed', '');
        }

        function cancel() {
            const press = session.current;

            if (!press) return;
            const id = press.id;
            clearTimeout(press.timer);
            highlight(null);
            session.current = null;
            group.removeAttribute('data-group-tracking');
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', pointerCancel);
            document.removeEventListener('scroll', abort, true);
            window.removeEventListener('blur', abort);
            window.removeEventListener('resize', abort);

            if (group.hasPointerCapture?.(id)) group.releasePointerCapture(id);
        }

        function begin() {
            const press = session.current;

            if (!press) return;
            press.active = true;
            group.setAttribute('data-group-tracking', '');
            highlight(targetAt(press.x, press.y));
        }

        function down(event: PointerEvent) {
            if (
                event.defaultPrevented ||
                (event.target instanceof Element && event.target.closest('[data-menu-trigger]'))
            )
                return;

            if (event.pointerType === 'mouse') {
                suppression.current = 0;

                return;
            }

            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

            if (session.current) {
                suppression.current = performance.now() + 600;
                cancel();

                return;
            }

            if (
                event.button !== 0 ||
                !event.isPrimary ||
                !(event.target instanceof Element) ||
                event.target.closest(boundary) !== group
            )
                return;

            const actions = Array.from(group.querySelectorAll<HTMLElement>('button, a[href]'))
                .filter((element) => !element.closest('[hidden], [inert], [aria-hidden="true"]'))
                .map((element) => ({
                    element,
                    rect: element.getBoundingClientRect(),
                    owned: element.closest(boundary) === group
                }))
                .filter(({ rect }) => rect.width > 0 && rect.height > 0);

            const press: GroupPress = {
                id: event.pointerId,
                pointer: event.pointerType,
                x: event.clientX,
                y: event.clientY,
                active: false,
                target: null,
                actions
            };

            session.current = press;

            if (!targetAt(event.clientX, event.clientY)) {
                cancel();

                return;
            }

            // A quick flick in a scrollable ancestor must scroll instead of activating an action.
            if (event.isTrusted) group.setPointerCapture?.(event.pointerId);
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
            document.addEventListener('pointercancel', pointerCancel);
            document.addEventListener('scroll', abort, true);
            window.addEventListener('blur', abort);
            window.addEventListener('resize', abort);
            let ancestor = group.parentElement;
            let scrollable = false;

            while (ancestor) {
                const style = window.getComputedStyle(ancestor);

                if (
                    (/(auto|scroll)/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight) ||
                    (/(auto|scroll)/.test(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth) ||
                    (ancestor === document.scrollingElement && ancestor.scrollHeight > ancestor.clientHeight)
                ) {
                    scrollable = true;
                    break;
                }

                ancestor = ancestor.parentElement;
            }

            if (scrollable) press.timer = setTimeout(begin, 150);
            else begin();
        }

        function move(event: PointerEvent) {
            const press = session.current;

            if (!press || event.pointerId !== press.id) return;

            if (!press.active && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
                suppression.current = performance.now() + 600;
                cancel();

                return;
            }

            if (press.active) highlight(targetAt(event.clientX, event.clientY));
        }

        function up(event: PointerEvent) {
            const press = session.current;

            if (!press || event.pointerId !== press.id) return;

            const target =
                press.active || Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8
                    ? targetAt(event.clientX, event.clientY)
                    : null;

            suppression.current = performance.now() + 600;
            cancel();

            if (
                target?.isConnected &&
                target.closest(boundary) === group &&
                !target.matches(disabled) &&
                !target.closest('[hidden], [inert], [aria-hidden="true"]')
            ) {
                target.focus({ preventScroll: true });
                target.click();
            }
        }

        function pointerCancel(event: PointerEvent) {
            const press = session.current;

            if (!press || event.pointerId !== press.id) return;
            suppression.current = performance.now() + 600;
            cancel();
        }

        function abort() {
            if (!session.current) return;
            suppression.current = performance.now() + 600;
            cancel();
        }

        function touch(event: TouchEvent) {
            if (session.current?.active && event.cancelable) event.preventDefault();
        }

        function click(event: MouseEvent) {
            if (
                event.detail > 0 &&
                performance.now() < suppression.current &&
                event.target instanceof Node &&
                group.contains(event.target)
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }

        function contextMenu(event: Event) {
            if (session.current?.active) event.preventDefault();
        }

        group.addEventListener('pointerdown', down);
        group.addEventListener('touchstart', touch, { passive: false });
        group.addEventListener('touchmove', touch, { passive: false });
        group.addEventListener('contextmenu', contextMenu);
        group.addEventListener('lostpointercapture', pointerCancel);
        document.addEventListener('click', click, true);

        return () => {
            cancel();
            group.removeEventListener('pointerdown', down);
            group.removeEventListener('touchstart', touch);
            group.removeEventListener('touchmove', touch);
            group.removeEventListener('contextmenu', contextMenu);
            group.removeEventListener('lostpointercapture', pointerCancel);
            document.removeEventListener('click', click, true);
        };
    }, [ref, enabled]);
}
