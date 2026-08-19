import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { requireXmlString, resolveXml } from '../core/props';
import { TextArea as AstryxTextArea } from '@astryxdesign/core/TextArea';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/TextArea?tab=properties
 * - label: string
 * - description: string
 * - value: string
 * - rows: positive integer
 * - maxLength: non-negative integer
 * - isDisabled: bool
 * - isRequired: bool
 */
export function TextArea({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const rows = resolveXml(props, 'rows', ctx);
    const label = requireXmlString(props, 'label', ctx, 'TextArea');
    const maxLength = resolveXml(props, 'maxLength', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);

    if (maxLength != null && (typeof maxLength !== 'number' || !Number.isInteger(maxLength) || maxLength < 0)) {
        throw new Error('TextArea maxLength must be a non-negative integer');
    }

    if (rows != null && (typeof rows !== 'number' || !Number.isInteger(rows) || rows <= 0)) {
        throw new Error('TextArea rows must be a positive integer');
    }

    return (
        <AstryxTextArea
            rows={typeof rows === 'number' ? rows : undefined}
            label={label}
            value={binding.value}
            onChange={binding.setValue}
            maxLength={typeof maxLength === 'number' ? maxLength : undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            description={typeof description === 'string' ? description : undefined}
        />
    );
}
