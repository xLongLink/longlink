import { z } from 'zod';
import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { fetchApiVoid } from '@/lib/api';
import { AuthPage } from '@/components/AuthPage';
import { sanitizeRedirectPath } from '@/lib/redirects';

type ForgotPasswordValues = {
    email: string;
};

const emailInputAttributes = { autoComplete: 'email' };

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const t = useTranslator();
    const location = useLocation();
    const nextPath = sanitizeRedirectPath(new URLSearchParams(location.search).get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const schema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<ForgotPasswordValues>({
        defaultValues: { email: '' },
        resolver: zodResolver(schema),
    });
    const requestReset = useMutation({
        mutationFn: async (payload: ForgotPasswordValues) => {
            await fetchApiVoid('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });

    return (
        <AuthPage title={t('auth.forgotPasswordTitle')} description={t('auth.forgotPasswordDescription')}>
            {requestReset.isSuccess ? (
                <Stack gap={4}>
                    <Banner status="success" title={t('auth.resetEmailSent')} />
                    <Button href={`/organizations?${nextQuery}`} label={t('auth.backToSignIn')} variant="primary" />
                </Stack>
            ) : (
                <Stack as="form" gap={4} onSubmit={form.handleSubmit((payload) => requestReset.mutate(payload))}>
                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...emailInputAttributes}
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
                    {requestReset.error ? <Banner status="error" title={requestReset.error.message} /> : null}
                    <Button
                        isDisabled={requestReset.isPending}
                        isLoading={requestReset.isPending}
                        label={requestReset.isPending ? t('auth.sendingResetEmail') : t('auth.sendResetEmail')}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
            )}
            {!requestReset.isSuccess ? (
                <Text as="p" color="secondary" justify="center" type="supporting">
                    <Link href={`/organizations?${nextQuery}`} type="inherit" weight="medium">
                        {t('auth.backToSignIn')}
                    </Link>
                </Text>
            ) : null}
        </AuthPage>
    );
}
