import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useTranslator } from '@astryxdesign/core/i18n';
import { IconButton } from '@astryxdesign/core/IconButton';
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup';
import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput';

type PasswordInputProps = Omit<TextInputProps, 'isLabelHidden' | 'type'> &
    Pick<ComponentProps<'input'>, 'autoComplete'> & {
        isLabelHidden?: boolean;
    };

/** Renders a password field with an accessible visibility toggle. */
export function PasswordInput({
    description,
    isDisabled,
    isLabelHidden,
    isOptional,
    isRequired,
    label,
    labelTooltip,
    size,
    status,
    ...props
}: PasswordInputProps) {
    const t = useTranslator();
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible ? t('auth.hidePassword') : t('auth.showPassword');

    return (
        <InputGroup
            className="w-full"
            description={description}
            isDisabled={isDisabled}
            isLabelHidden={isLabelHidden}
            isOptional={isOptional}
            isRequired={isRequired}
            label={label}
            labelTooltip={labelTooltip}
            size={size}
            status={status}
        >
            <TextInput
                {...props}
                isDisabled={isDisabled}
                isLabelHidden
                isRequired={isRequired}
                label={label}
                status={status ? { type: status.type } : undefined}
                type={visible ? 'text' : 'password'}
            />
            <InputGroupText>
                <IconButton
                    aria-pressed={visible}
                    icon={visible ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                    label={toggleLabel}
                    onClick={() => setVisible((current) => !current)}
                    size="sm"
                    tooltip={toggleLabel}
                    variant="ghost"
                />
            </InputGroupText>
        </InputGroup>
    );
}
