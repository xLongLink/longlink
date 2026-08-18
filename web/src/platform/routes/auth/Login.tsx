import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { api } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { Divider } from '@/components/ui/Divider';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { AuthLayout } from './AuthLayout';
import { TermsNotice } from './TermsNotice';
import { emailSchema, passwordSchema } from './validation';

const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

type LoginValues = z.infer<typeof loginSchema>;

/** Renders the standalone account sign-in page. */
export default function Login() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const showToast = useToast();
    const { user } = useCurrentUser();
    const form = useForm<LoginValues>({
        defaultValues: { email: searchParams.get('email') ?? '', password: '' },
        resolver: zodResolver(loginSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const registerHref = email ? `/auth/register?${new URLSearchParams({ email })}` : '/auth/register';
    const login = useMutation({
        mutationFn: (payload: LoginValues) => api('/api/v1/auth/password/login', { json: payload, method: 'POST' }),
    });

    // Keep authenticated users out of the sign-in page.
    if (user) {
        return <Navigate replace to="/user/organizations" />;
    }

    /** Signs in with an email and password. */
    async function handlePasswordSignIn(payload: LoginValues) {
        try {
            await login.mutateAsync(payload);
            navigate('/user/organizations', { replace: true });
        } catch (loginError) {
            showToast({
                body: loginError instanceof Error ? loginError.message : 'Sign in failed',
                type: 'error',
            });
        }
    }

    return (
        <AuthLayout title={<WelcomeTitle />} description={<Divider>{'Sign in with your email and password.'}</Divider>}>
            <Stack gap={4}>
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
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
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
                                        fieldState.error
                                            ? { type: 'error', message: fieldState.error.message }
                                            : undefined
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

                <Divider>
                    New to LongLink?{' '}
                    <Link href={registerHref} type="inherit" weight="medium">
                        Create account
                    </Link>
                </Divider>

                <TermsNotice />
            </Stack>
        </AuthLayout>
    );
}
