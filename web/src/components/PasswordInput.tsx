import { Icon } from '@astryxdesign/core/Icon';
import { useState, type ComponentProps } from 'react';
import { IconButton } from '@astryxdesign/core/IconButton';
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup';
import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput';
import { useTranslation } from '@/lib/i18n';

type PasswordInputProps = Omit<TextInputProps, 'isLabelHidden' | 'type'> &
    Pick<ComponentProps<'input'>, 'autoComplete'>;

/** Renders a password field with an accessible visibility toggle. */
export function PasswordInput({
    description,
    isDisabled,
    isOptional,
    isRequired,
    label,
    labelTooltip,
    size,
    status,
    ...props
}: PasswordInputProps) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible ? t('auth.hidePassword') : t('auth.showPassword');

    return (
        <InputGroup
            description={description}
            isDisabled={isDisabled}
            isOptional={isOptional}
            isRequired={isRequired}
            label={label}
            labelTooltip={labelTooltip}
            size={size}
            style={{ width: '100%' }}
            status={status}
        >
            <TextInput
                {...props}
                isDisabled={isDisabled}
                isLabelHidden
                isRequired={isRequired}
                label={label}
                status={status ? { type: status.type } : undefined}
                style={{ flex: 1, minWidth: 0 }}
                type={visible ? 'text' : 'password'}
            />
            <InputGroupText>
                <IconButton
                    aria-pressed={visible}
                    icon={<Icon icon="eyeSlash" size="sm" />}
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
