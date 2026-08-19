import { api } from '@/lib/api';
import { AuthLayout } from './AuthLayout';
import { Link } from '@astryxdesign/core/Link';
import { useSearchParams } from 'react-router';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Divider } from '@/components/ui/Divider';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { emailPayloadSchema, type EmailPayload } from './validation';

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const showToast = useToast();
    const [searchParams] = useSearchParams();
    const initialEmail = searchParams.get('email') ?? '';
    const form = useForm({
        defaultValues: { email: initialEmail },
        validationLogic: revalidateLogic(),
        validators: { onDynamic: emailPayloadSchema },
        onSubmit: ({ value }) => registration.mutate(value),
    });
    const registration = useMutation({
        mutationFn: (payload: EmailPayload) => api('/api/v1/auth/register', { json: payload, method: 'POST' }),
        onSuccess: () => {
            showToast({ body: 'If this email can be registered, a registration link is on the way.', type: 'info' });
        },
        onError: () => {
            showToast({ body: 'Could not send the registration link. Try again shortly.', type: 'error' });
        },
    });

    return (
        <AuthLayout description={<Divider>{'Please enter your email'}</Divider>} title={<WelcomeTitle />}>
            <Stack gap={3}>
                <Stack
                    as="form"
                    gap={3}
                    onSubmit={(event) => {
                        event.preventDefault();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field
                        name="email"
                        children={(field) => (
                            <TextInput
                                {...{ autoComplete: 'email' }}
                                htmlName="email"
                                isRequired
                                label="Email"
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                                status={
                                    field.state.meta.errors.length > 0
                                        ? { type: 'error', message: field.state.meta.errors[0]?.message }
                                        : undefined
                                }
                                type="email"
                                value={field.state.value}
                                width="100%"
                            />
                        )}
                    />
                    <Button
                        isLoading={registration.isPending}
                        label={registration.isPending ? 'Sending registration link...' : 'Send registration link'}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
                <form.Subscribe selector={(state) => state.values.email}>
                    {(email) => {
                        const trimmedEmail = email.trim();
                        const signInHref = trimmedEmail
                            ? `/login?${new URLSearchParams({ email: trimmedEmail })}`
                            : '/login';

                        return (
                            <Divider>
                                Already have an account?{' '}
                                <Link href={signInHref} type="inherit" weight="medium">
                                    Sign In
                                </Link>
                            </Divider>
                        );
                    }}
                </form.Subscribe>
            </Stack>
        </AuthLayout>
    );
}
