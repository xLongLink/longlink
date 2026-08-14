import { z } from 'zod';
import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { fetchApiVoid } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AuthPage } from '@/components/AuthPage';
import { platformApiPath } from '@/lib/platform-api';
import { AuthWelcomeTitle } from '@/components/AuthWelcomeTitle';

type RegisterValues = {
    email: string;
};

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const showToast = useToast();
    const initialEmail = new URLSearchParams(useLocation().search).get('email') ?? '';
    const schema = z.object({
        email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    });
    const form = useForm<RegisterValues>({
        defaultValues: { email: initialEmail },
        resolver: zodResolver(schema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const signInHref = email ? `/organizations?${new URLSearchParams({ email })}` : '/organizations';
    const registration = useMutation({
        mutationFn: (payload: RegisterValues) =>
            fetchApiVoid(platformApiPath('/auth/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            showToast({ body: 'If this email can be registered, a registration link is on the way.', type: 'info' });
        },
        onError: () => {
            showToast({ body: 'Could not send the registration link. Try again shortly.', type: 'error' });
        },
    });

    return (
        <AuthPage title={<AuthWelcomeTitle />} description={<Divider label="Please enter your email" />}>
            <Stack gap={3}>
                <Stack as="form" gap={3} onSubmit={form.handleSubmit((values) => registration.mutate(values))}>
                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...{ autoComplete: 'email' }}
                                ref={field.ref}
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
                        label={registration.isPending ? 'Sending registration link...' : 'Send registration link'}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
                <Divider
                    label={
                        <>
                            Already have an account?{' '}
                            <Link href={signInHref} type="inherit" weight="medium">
                                Sign In
                            </Link>
                        </>
                    }
                />
            </Stack>
        </AuthPage>
    );
}
