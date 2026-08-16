import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import type { Props } from '../types';
import { ICON_NAMES } from '../constants';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

export function Icon({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const icon = requireXmlString(props, 'icon', ctx, 'Icon');
    const label = resolveXml(props, 'label', ctx);

    if (!isXmlEnum(icon, ICON_NAMES)) {
        throw new Error(`Unsupported Icon icon '${icon}'`);
    }

    return <AstryxIcon icon={icon} label={typeof label === 'string' ? label : undefined} />;
}
