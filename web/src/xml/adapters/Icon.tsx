import type { Props } from '@/xml/types';
import { isIconName } from '@/lib/icons';
import { useXmlContext } from '@/xml/core/context';
import { Icon as UIIcon } from '@/components/ui/icon';
import { resolveXmlString } from './props';
import { useActionHandler } from './Action';

/** Renders a Lucide icon by XML name. */
export function Icon({ props }: Props) {
    const { ctx } = useXmlContext();
    const name = resolveXmlString(props, 'name', ctx, '');
    const iconName = String(name ?? '');
    const actionHandler = useActionHandler();

    // Fail fast when the caller omits the required icon name.
    if (!iconName.trim()) {
        throw new Error('Icon requires a string name');
    }

    // Reject unsupported names instead of silently rendering a different icon.
    if (!isIconName(iconName)) {
        throw new Error(`Unknown icon "${iconName}"`);
    }

    // Use a button shell when the icon triggers an action.
    if (actionHandler) {
        return (
            <button
                aria-label={iconName}
                className="inline-flex cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                type="button"
                onClick={() => {
                    void actionHandler();
                }}
            >
                <UIIcon name={iconName} className="size-4 shrink-0" />
            </button>
        );
    }

    return <UIIcon name={iconName} className="size-4 shrink-0" />;
}
