import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { useEffect, useRef } from 'react';
import { NoIndex } from '@/components/Seo';
import { useApiError } from '@/lib/errors';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { AuthForm, AuthLayout } from './AuthLayout';
import { Divider } from '@astryxdesign/core/Divider';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { zodResolver } from '@hookform/resolvers/zod';
import { clearSessionQueries } from '@/lib/react-query';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { emailSchema, passwordSchema } from './validation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { zOAuthAvailability } from '@/lib/generated/platform-api-v1/zod.gen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

type LoginValues = z.infer<typeof loginSchema>;

/** Renders the standalone account sign-in page. */
export default function Login() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const reportApiError = useApiError();
    const oauthError = searchParams.get('oauth_error') === '1';
    const oauthFailure = useRef<ApiError | null>(null);
    const { data: user } = useCurrentUser();
    const { data: oauthAvailability } = useQuery({
        queryKey: ['api', '/api/v1/auth/oauth'],
        queryFn: async ({ signal }) => zOAuthAvailability.parse(await api('/api/v1/auth/oauth', { signal }).json()),
        enabled: !user,
        staleTime: Infinity,
    });
    const hasOAuthProvider = oauthAvailability?.github || oauthAvailability?.google;
    const form = useForm<LoginValues>({
        defaultValues: { email: searchParams.get('email') ?? '', password: '' },
        resolver: zodResolver(loginSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' });
    const trimmedEmail = email.trim();
    const registerSearch = trimmedEmail ? `?${new URLSearchParams({ email: trimmedEmail })}` : '';
    const login = useMutation({
        mutationFn: (payload: LoginValues) => api('/api/v1/auth/password/login', { json: payload, method: 'POST' }),
        onSuccess: async () => {
            // A new login must never reuse data from the previous identity.
            await clearSessionQueries(queryClient);
            navigate('/user/organizations', { replace: true });
        },
    });

    // Reuse the callback error so central reporting deduplicates effect replays.
    useEffect(() => {
        if (oauthError) {
            oauthFailure.current ??= new ApiError('Unable to sign in with this provider. Please try again.', 400);
            reportApiError(oauthFailure.current);
        } else {
            oauthFailure.current = null;
        }
    }, [oauthError, reportApiError]);

    // Keep authenticated users out of the sign-in page.
    if (user) {
        return (
            <>
                <NoIndex title="LongLink" />
                <Navigate replace to="/user/organizations" />
            </>
        );
    }

    /** Signs in with an email and password. */
    async function handlePasswordSignIn(payload: LoginValues) {
        try {
            await login.mutateAsync(payload);
        } catch {
            // The mutation cache reports failures; keep the form available for retry.
        }
    }

    return (
        <AuthLayout title={<WelcomeTitle />} description={null}>
            <NoIndex title="Sign In | LongLink" />
            <Stack gap={4}>
                <Stack gap={2}>
                    {hasOAuthProvider ? (
                        <Stack gap={2}>
                            <Divider label="Continue with social" />
                            <Stack gap={2}>
                                {oauthAvailability?.google ? (
                                    <Button
                                        label="Continue with Google"
                                        onClick={() => window.location.assign('/api/v1/auth/oauth/google')}
                                        width="100%"
                                    />
                                ) : null}
                                {oauthAvailability?.github ? (
                                    <Button
                                        label="Continue with GitHub"
                                        onClick={() => window.location.assign('/api/v1/auth/oauth/github')}
                                        width="100%"
                                    />
                                ) : null}
                            </Stack>
                            <Divider label="or sign in with email" />
                        </Stack>
                    ) : null}
                    <AuthForm gap={2} onSubmit={form.handleSubmit(handlePasswordSignIn)}>
                        <Stack gap={1}>
                            <Text type="label">Email</Text>
                            <Controller
                                control={form.control}
                                name="email"
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        ref={field.ref}
                                        htmlName={field.name}
                                        isLabelHidden
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
                        </Stack>
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
                            label="Sign In"
                            type="submit"
                            variant="primary"
                            width="100%"
                        />
                    </AuthForm>
                </Stack>

                <Divider
                    label={
                        <>
                            New to LongLink?{' '}
                            <Link href={`/auth/register${registerSearch}`} type="inherit" weight="medium">
                                Create account
                            </Link>
                        </>
                    }
                />
            </Stack>
        </AuthLayout>
    );
}
