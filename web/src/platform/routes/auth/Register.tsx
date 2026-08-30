import { api } from '@/lib/api';
import { Link } from '@astryxdesign/core/Link';
import { useSearchParams } from 'react-router';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { AuthForm, AuthLayout } from './AuthLayout';
import { useMutation } from '@tanstack/react-query';
import { Divider } from '@astryxdesign/core/Divider';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { emailPayloadSchema, fieldErrorStatus, type EmailPayload } from './validation';

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const showToast = useToast();
    const [searchParams] = useSearchParams();
    const form = useForm({
        defaultValues: { email: searchParams.get('email') ?? '' },
        validationLogic: revalidateLogic(),
        validators: { onDynamic: emailPayloadSchema },
        onSubmit: ({ value }) => registration.mutate(value),
    });
    const registration = useMutation({
        mutationFn: (payload: EmailPayload) => api('/api/v1/auth/register', { json: payload, method: 'POST' }),
        onSuccess: () =>
            showToast({ body: 'If this email can be registered, a registration link is on the way.', type: 'info' }),
        onError: () => showToast({ body: 'Could not send the registration link. Try again shortly.', type: 'error' }),
    });

    return (
        <AuthLayout description={<Divider label="Please enter your email" />} title={<WelcomeTitle />}>
            <Stack gap={3}>
                <AuthForm gap={3} onSubmit={form.handleSubmit}>
                    <form.Field
                        name="email"
                        children={(field) => (
                            <TextInput
                                autoComplete="email"
                                htmlName="email"
                                isRequired
                                label="Email"
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                                status={fieldErrorStatus(field.state.meta.errors)}
                                type="email"
                                value={field.state.value}
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
                <form.Subscribe selector={(state) => state.values.email}>
                    {(email) => {
                        const trimmedEmail = email.trim();
                        const signInSearch = trimmedEmail ? `?${new URLSearchParams({ email: trimmedEmail })}` : '';

                        return (
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
                        );
                    }}
                </form.Subscribe>
            </Stack>
        </AuthLayout>
    );
}
