import { api } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { Link } from '@astryxdesign/core/Link';
import { useSearchParams } from 'react-router';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { AuthForm, AuthLayout } from './AuthLayout';
import { useMutation } from '@tanstack/react-query';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { emailPayloadSchema, type EmailPayload } from './validation';

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const showToast = useToast();
    const [searchParams] = useSearchParams();
    const registration = useMutation({
        mutationFn: (payload: EmailPayload) => api('/api/v1/auth/register', { json: payload, method: 'POST' }),
        onSuccess: () => showToast({ body: 'If this email can be registered, a registration link is on the way.' }),
        onError: () => showToast({ body: 'Could not send the registration link. Try again shortly.', type: 'error' }),
    });
    const form = useForm<EmailPayload>({
        defaultValues: { email: searchParams.get('email') ?? '' },
        resolver: zodResolver(emailPayloadSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' });
    const trimmedEmail = email.trim();
    const signInSearch = trimmedEmail ? `?${new URLSearchParams({ email: trimmedEmail })}` : '';

    return (
        <AuthLayout description={<Divider label="Please enter your email" />} title={<WelcomeTitle />}>
            <NoIndex title="Create Account | LongLink" />
            <Stack gap={3}>
                <AuthForm gap={3} onSubmit={form.handleSubmit((value) => registration.mutate(value))}>
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
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                                type="email"
                                value={field.value}
                                width="100%"
                            />
                        )}
                    />
                    <Button
                        isLoading={registration.isPending}
                        label="Send registration link"
                        type="submit"
                        variant="primary"
                    />
                </AuthForm>
                <Divider
                    label={
                        <>
                            Already have an account?{' '}
                            <Link href={`/login${signInSearch}`} type="inherit" weight="medium">
                                Sign In
                            </Link>
                        </>
                    }
                />
            </Stack>
        </AuthLayout>
    );
}
