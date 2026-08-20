import type { Props } from '../types';
import { COMPACT_SIZES } from '../constants';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';

export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<boolean | 'indeterminate'>(props, 'value', ctx, (value) =>
        value === 'indeterminate' ? value : value === true || value === 'true'
    );
    const size = resolveXml(props, 'size', ctx);
    const width = resolveXml(props, 'width', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);

    if (!isXmlEnum(size, [undefined, ...COMPACT_SIZES])) {
        throw new Error(`Unsupported CheckboxInput size '${String(size)}'`);
    }

    return (
        <AstryxCheckboxInput
            size={size}
            label={requireXmlString(props, 'label', ctx, 'CheckboxInput')}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            status={resolveInputStatus(props, ctx)}
            htmlName={typeof htmlName === 'string' ? htmlName : undefined}
            onChange={binding.setValue}
            isLoading={typeof isLoading === 'boolean' ? isLoading : undefined}
            isOptional={typeof isOptional === 'boolean' ? isOptional : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            description={typeof description === 'string' ? description : undefined}
            isLabelHidden={typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined}
        />
    );
}
