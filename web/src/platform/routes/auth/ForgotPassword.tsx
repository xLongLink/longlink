import { api } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { AuthForm, AuthLayout } from './AuthLayout';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { emailPayloadSchema, type EmailPayload } from './validation';

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const requestReset = useMutation({
        mutationFn: (payload: EmailPayload) => api('/api/v1/auth/forgot-password', { json: payload, method: 'POST' }),
    });
    const form = useForm<EmailPayload>({
        defaultValues: { email: '' },
        resolver: zodResolver(emailPayloadSchema),
    });

    return (
        <AuthLayout
            title="Reset your password"
            description="Enter your account email and LongLink will send password reset instructions."
        >
            <NoIndex title="Reset Your Password | LongLink" />
            {requestReset.isSuccess ? (
                <Stack gap={4}>
                    <Banner
                        status="success"
                        title="If an account exists for that email, password reset instructions are on the way."
                    />
                    <Button href="/login" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <>
                    <AuthForm gap={4} onSubmit={form.handleSubmit((value) => requestReset.mutate(value))}>
                        <Controller
                            control={form.control}
                            name="email"
                            render={({ field, fieldState }) => (
                                <TextInput
                                    ref={field.ref}
                                    autoComplete="email"
                                    htmlName={field.name}
                                    isRequired
                                    label="Email"
                                    onBlur={field.onBlur}
                                    onChange={field.onChange}
                                    status={
                                        fieldState.error
                                            ? { type: 'error', message: fieldState.error.message }
                                            : undefined
                                    }
                                    type="email"
                                    value={field.value}
                                    width="100%"
                                />
                            )}
                        />
                        <Button
                            isLoading={requestReset.isPending}
                            label="Send reset email"
                            type="submit"
                            variant="primary"
                        />
                    </AuthForm>
                    <Text as="p" justify="center" type="supporting">
                        <Link href="/login" type="inherit" weight="medium">
                            Back to sign in
                        </Link>
                    </Text>
                </>
            )}
        </AuthLayout>
    );
}
