import { useEffect, useRef } from 'react';
import type { Menu } from '@base-ui/react/menu';

/** Lets a finger or pen open on press and slide to an action before releasing. */
export function useMenuTouch(owner: string, open: boolean, disabled: boolean, changeOpen: (open: boolean) => void) {
    const cleanup = useRef<(() => void) | null>(null);
    const suppressClick = useRef(false);

    useEffect(() => () => cleanup.current?.(), []);

    useEffect(() => {
        if (!open || disabled) cleanup.current?.();
    }, [open, disabled]);

    const onPointerDown: Menu.Trigger.Props['onPointerDown'] = (event) => {
        cleanup.current?.();
        suppressClick.current = false;

        if (disabled || !['touch', 'pen'].includes(event.pointerType) || event.button !== 0) return;

        // Cancel compatibility mouse events; the gesture owns this press through release.
        event.preventDefault();
        suppressClick.current = true;
        event.currentTarget.focus();
        changeOpen(!open);

        if (open) return;

        const document = event.currentTarget.ownerDocument;
        const { pointerId, clientX, clientY } = event;
        let moved = false;

        // Geometry is read again on release; a previous highlight is never an activation target.
        function itemAt(pointer: PointerEvent) {
            const target = document.elementFromPoint(pointer.clientX, pointer.clientY);
            const item = target?.closest<HTMLElement>('[role="menuitem"]');

            if (!item || item.closest('[data-view-menu]')?.getAttribute('data-view-menu') !== owner) return null;

            if (item.getAttribute('aria-disabled') === 'true') return null;

            return item;
        }

        function move(pointer: PointerEvent) {
            if (pointer.pointerId !== pointerId) return;
            pointer.preventDefault();
            moved ||= Math.hypot(pointer.clientX - clientX, pointer.clientY - clientY) > 8;

            if (!moved) return;

            itemAt(pointer)?.focus();
        }

        function finish(pointer: PointerEvent) {
            if (pointer.pointerId !== pointerId) return;
            cleanup.current?.();

            if (pointer.type === 'pointercancel') return;

            moved ||= Math.hypot(pointer.clientX - clientX, pointer.clientY - clientY) > 8;

            if (moved) itemAt(pointer)?.click();
        }

        document.addEventListener('pointermove', move, { passive: false });
        document.addEventListener('pointerup', finish);
        document.addEventListener('pointercancel', finish);
        cleanup.current = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', finish);
            document.removeEventListener('pointercancel', finish);
            cleanup.current = null;
        };
    };

    const onClick: Menu.Trigger.Props['onClick'] = (event) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.preventBaseUIHandler();
    };

    const onKeyDown: Menu.Trigger.Props['onKeyDown'] = () => {
        suppressClick.current = false;
    };

    return { onPointerDown, onClick, onKeyDown };
}
