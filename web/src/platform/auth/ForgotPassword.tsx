import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthPage } from '@/components/AuthPage';
import { useToast } from '@/hooks/use-toast';
import { fetchApiVoid } from '@/lib/api';
import { platformApiPath } from '@/lib/platform-api';

type ForgotPasswordValues = {
    email: string;
};

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const t = useTranslator();
    const showToast = useToast();
    const schema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<ForgotPasswordValues>({
        defaultValues: { email: '' },
        resolver: zodResolver(schema),
    });
    const requestReset = useMutation({
        mutationFn: (payload: ForgotPasswordValues) =>
            fetchApiVoid(platformApiPath('/auth/forgot-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        onError: (error) => {
            showToast({
                body: error instanceof Error ? error.message : t('appView.retryLater'),
                type: 'error',
            });
        },
    });

    return (
        <AuthPage title={t('auth.forgotPasswordTitle')} description={t('auth.forgotPasswordDescription')}>
            {requestReset.isSuccess ? (
                <Stack gap={4}>
                    <Banner status="success" title={t('auth.resetEmailSent')} />
                    <Button href="/organizations" label={t('auth.backToSignIn')} variant="primary" />
                </Stack>
            ) : (
                <Stack as="form" gap={4} onSubmit={form.handleSubmit((values) => requestReset.mutate(values))}>
                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...{ autoComplete: 'email' }}
                                ref={field.ref}
                                htmlName={field.name}
                                isRequired
                                label={t('labels.email')}
                                onBlur={field.onBlur}
                                onChange={field.onChange}
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                                type="email"
                                value={field.value}
                                width="100%"
                            />
                        )}
                    />
                    <Button
                        isLoading={requestReset.isPending}
                        label={requestReset.isPending ? t('auth.sendingResetEmail') : t('auth.sendResetEmail')}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
            )}
            {!requestReset.isSuccess ? (
                <Text as="p" color="secondary" justify="center" type="supporting">
                    <Link href="/organizations" type="inherit" weight="medium">
                        {t('auth.backToSignIn')}
                    </Link>
                </Text>
            ) : null}
        </AuthPage>
    );
}
