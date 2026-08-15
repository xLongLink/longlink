import { z } from 'zod';
import { useNavigate } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestApiJson } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { platformApiPath } from '@/lib/platform-api';
import { userProfileQueryKey } from '@/lib/query-keys';
import { WelcomeTitle } from '@/components/WelcomeTitle';

const loginSchema = z.object({
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required').max(1024, 'Password cannot exceed 1024 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Renders the shared LongLink sign-in form. */
export function SignInCard({ initialEmail = '' }: { initialEmail?: string }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const showToast = useToast();
    const form = useForm<LoginValues>({
        defaultValues: { email: initialEmail, password: '' },
        resolver: zodResolver(loginSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const registerHref = email ? `/auth/register?${new URLSearchParams({ email })}` : '/auth/register';
    const login = useMutation({
        mutationFn: (payload: LoginValues) =>
            requestApiJson(platformApiPath('/auth/password/login'), payload, { method: 'POST' }),
    });

    /** Signs in with an email and password, then refreshes the current profile. */
    async function handlePasswordSignIn(payload: LoginValues) {
        try {
            await login.mutateAsync(payload);
            await queryClient.invalidateQueries({ queryKey: userProfileQueryKey });
            navigate('/organizations', { replace: true });
        } catch (loginError) {
            showToast({
                body: loginError instanceof Error ? loginError.message : 'Sign in failed',
                type: 'error',
            });
        }
    }

    return (
        <Stack gap={4} maxWidth={384} width="100%">
            <Stack gap={1} hAlign="center">
                <Heading level={1} justify="center">
                    <WelcomeTitle />
                </Heading>
                <Divider label="Sign in with your email and password." />
            </Stack>

            <Stack as="form" gap={3} onSubmit={form.handleSubmit(handlePasswordSignIn)}>
                <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            htmlName={field.name}
                            isRequired
                            label="Email"
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                            type="email"
                            value={field.value}
                            width="100%"
                        />
                    )}
                />
                <Stack gap={1}>
                    <Stack direction="horizontal" hAlign="between" vAlign="center">
                        <Text type="label">Password</Text>
                        <Link href="/auth/forgot-password" type="supporting">
                            Forgot password?
                        </Link>
                    </Stack>
                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <TextInput
                                ref={field.ref}
                                htmlName={field.name}
                                isLabelHidden
                                isRequired
                                label="Password"
                                onBlur={field.onBlur}
                                onChange={field.onChange}
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                                value={field.value}
                                width="100%"
                                type="password"
                            />
                        )}
                    />
                </Stack>
                <Button
                    isLoading={login.isPending}
                    label={login.isPending ? 'Signing in...' : 'Sign In'}
                    type="submit"
                    variant="primary"
                    width="100%"
                />
            </Stack>

            <Divider
                label={
                    <>
                        New to LongLink?{' '}
                        <Link href={registerHref} type="inherit" weight="medium">
                            Create account
                        </Link>
                    </>
                }
            />

            <Text as="p" color="secondary" justify="center" type="supporting">
                By continuing, you agree to our <br />
                <Link href="/terms" hasUnderline type="inherit">
                    Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" hasUnderline type="inherit">
                    Privacy Policy
                </Link>
                .
            </Text>
        </Stack>
    );
}
