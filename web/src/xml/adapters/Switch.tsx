import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';
import { requireXmlString } from '../core/props';

export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => value !== 'false' && Boolean(value));
    return (
        <AstryxSwitch
            label={requireXmlString(props, 'label', ctx, 'Switch')}
            value={binding.value}
            onChange={binding.setValue}
        />
    );
}
