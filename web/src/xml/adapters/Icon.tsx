import { useXmlContext } from '@xml/core/context';
import type { Props } from '@xml/types';
import { Icon as UIIcon } from '@/components/ui/icon';
import { resolveXmlString } from './props';

/** Props accepted by the XML Icon component. */

/** Renders a Lucide icon by XML name. */
export function Icon({ props }: Props) {
    const { ctx } = useXmlContext();
    const name = resolveXmlString(props, 'name', ctx, '');
    const iconName = String(name ?? '');

    // Fail fast when the caller omits the required icon name.
    if (!iconName.trim()) {
        throw new Error('Icon requires a string name');
    }

    return <UIIcon name={iconName} className="size-4 shrink-0" />;
}
