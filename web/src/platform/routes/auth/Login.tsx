import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { TextInput } from '@astryxdesign/core/TextInput';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { api } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { Divider } from '@/components/ui/Divider';
import { useCurrentUser } from '@/lib/hooks/use-user';
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
    const form = useForm({
        defaultValues: { email: searchParams.get('email') ?? '', password: '' },
        validationLogic: revalidateLogic(),
        validators: { onDynamic: loginSchema },
        onSubmit: ({ value }) => handlePasswordSignIn(value),
    });
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
                                htmlName="email"
                                isRequired
                                label="Email"
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
                    <Stack gap={1}>
                        <Stack direction="horizontal" hAlign="between" vAlign="center">
                            <Text type="label">Password</Text>
                            <Link href="/auth/forgot-password" type="supporting">
                                Forgot password?
                            </Link>
                        </Stack>
                        <form.Field
                            name="password"
                            children={(field) => (
                                <TextInput
                                    htmlName="password"
                                    isLabelHidden
                                    isRequired
                                    label="Password"
                                    onBlur={field.handleBlur}
                                    onChange={field.handleChange}
                                    status={
                                        field.state.meta.errors.length > 0
                                            ? { type: 'error', message: field.state.meta.errors[0]?.message }
                                            : undefined
                                    }
                                    value={field.state.value}
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

                <form.Subscribe selector={(state) => state.values.email}>
                    {(email) => {
                        const trimmedEmail = email.trim();
                        const registerHref = trimmedEmail
                            ? `/auth/register?${new URLSearchParams({ email: trimmedEmail })}`
                            : '/auth/register';

                        return (
                            <Divider>
                                New to LongLink?{' '}
                                <Link href={registerHref} type="inherit" weight="medium">
                                    Create account
                                </Link>
                            </Divider>
                        );
                    }}
                </form.Subscribe>

                <TermsNotice />
            </Stack>
        </AuthLayout>
    );
}
