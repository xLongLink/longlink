import { Divider as AstryxDivider } from '@astryxdesign/core-0-3/Divider';
import type { Props } from '../types';
import { resolveXml } from '../core/props';
import { useXmlRuntime } from '../core/context';

export function Divider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = resolveXml(props, 'label', ctx);

    return <AstryxDivider label={typeof label === 'string' ? label : undefined} />;
}
