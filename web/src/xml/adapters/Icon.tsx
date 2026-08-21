import { z } from 'zod';
import type { Props } from '../types';
import { ICON_NAMES } from '../constants';
import { useXmlRuntime } from '../core/context';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';

const iconPropsSchema = z.object({
    icon: xmlNonblankStringSchema.pipe(z.enum(ICON_NAMES)),
    label: z.string().optional(),
});

export function Icon({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { icon, label } = resolveXmlProps(props, ctx, { icon: 'raw', label: 'scalar' }, iconPropsSchema);

    return <AstryxIcon icon={icon} label={label} />;
}
