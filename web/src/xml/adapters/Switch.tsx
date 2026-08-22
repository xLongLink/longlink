import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';
import { coerceXmlBoolean, useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';

export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, coerceXmlBoolean);
    const { label } = resolveXmlProps(props, ctx, { label: 'raw' }, xmlLabelPropsSchema);

    return <AstryxSwitch label={label} size="sm" value={binding.value} onChange={binding.setValue} />;
}
