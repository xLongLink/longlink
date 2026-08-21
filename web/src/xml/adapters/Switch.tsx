import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';

export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => value !== 'false' && Boolean(value));
    const { label } = resolveXmlProps(props, ctx, { label: 'raw' }, xmlLabelPropsSchema);

    return <AstryxSwitch label={label} size="sm" value={binding.value} onChange={binding.setValue} />;
}
