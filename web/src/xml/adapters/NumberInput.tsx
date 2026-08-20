import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { requireXmlString, resolveXml } from '../core/props';
import { NumberInput as AstryxNumberInput } from '@astryxdesign/core/NumberInput';

export function NumberInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? undefined : Number(value)));
    const max = resolveXml(props, 'max', ctx);
    const min = resolveXml(props, 'min', ctx);
    const step = resolveXml(props, 'step', ctx);
    const units = resolveXml(props, 'units', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const isIntegerOnly = resolveXml(props, 'isIntegerOnly', ctx);
    return (
        <AstryxNumberInput
            max={typeof max === 'number' ? max : undefined}
            min={typeof min === 'number' ? min : undefined}
            step={typeof step === 'number' ? step : undefined}
            label={requireXmlString(props, 'label', ctx, 'NumberInput')}
            units={typeof units === 'string' ? units : undefined}
            value={binding.value}
            onChange={binding.setValue}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            description={typeof description === 'string' ? description : undefined}
            isIntegerOnly={typeof isIntegerOnly === 'boolean' ? isIntegerOnly : undefined}
        />
    );
}
