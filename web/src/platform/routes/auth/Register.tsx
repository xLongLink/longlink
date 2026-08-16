import type { ReactNode } from 'react';
import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { useSearchParams } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { useMutation } from '@tanstack/react-query';
import { Heading } from '@astryxdesign/core/Heading';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { api } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { Divider } from '@/components/ui/Divider';
import { WelcomeTitle } from '@/components/WelcomeTitle';

const registerSchema = z.object({
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});

type RegisterValues = z.infer<typeof registerSchema>;

/** Renders registration content within the standalone account page. */
function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px))" width="100%">
            <Stack gap={4} maxWidth={384} paddingBlock={8} paddingInline={4} width="100%">
                <Stack gap={1}>
                    <Heading justify="center" level={1}>
                        <WelcomeTitle />
                    </Heading>
                    <Divider>{'Please enter your email'}</Divider>
                </Stack>
                {children}
            </Stack>
        </Center>
    );
}

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const showToast = useToast();
    const [searchParams] = useSearchParams();
    const initialEmail = searchParams.get('email') ?? '';
    const form = useForm<RegisterValues>({
        defaultValues: { email: initialEmail },
        resolver: zodResolver(registerSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const signInHref = email ? `/login?${new URLSearchParams({ email })}` : '/login';
    const registration = useMutation({
        mutationFn: (payload: RegisterValues) => api('/api/v1/auth/register', { json: payload, method: 'POST' }),
        onSuccess: () => {
            showToast({ body: 'If this email can be registered, a registration link is on the way.', type: 'info' });
        },
        onError: () => {
            showToast({ body: 'Could not send the registration link. Try again shortly.', type: 'error' });
        },
    });

    return (
        <AuthLayout>
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
                <Divider>
                    Already have an account?{' '}
                    <Link href={signInHref} type="inherit" weight="medium">
                        Sign In
                    </Link>
                </Divider>
            </Stack>
        </AuthLayout>
    );
}
