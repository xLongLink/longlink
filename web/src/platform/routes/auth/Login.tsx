import { z } from 'zod';
import { TextField } from './Field';
import { Seo } from '@/components/Seo';
import { AuthLayout } from './AuthLayout';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NoIndex } from '@/components/NoIndex';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useForm, useWatch } from 'react-hook-form';
import { Divider } from '@astryxdesign/core/Divider';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { zodResolver } from '@hookform/resolvers/zod';
import { clearSessionQueries } from '@/lib/react-query';
import { emailSchema, passwordSchema } from './validation';
import { IconButton } from '@astryxdesign/core/IconButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { zOAuthAvailability } from '@/lib/generated/platform-api-v1/zod.gen';

const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

type LoginValues = z.infer<typeof loginSchema>;

const oauthProviders = [
    { availability: 'google', label: 'Continue with Google', path: '/api/v1/auth/oauth/google' },
    { availability: 'github', label: 'Continue with GitHub', path: '/api/v1/auth/oauth/github' },
] as const;

/** Renders the standalone account sign-in page. */
export default function Login() {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const reportApiError = useApiError();
    const oauthError = searchParams.get('oauth_error') === '1';
    const { data: user } = useCurrentUser();

    const { data: oauthAvailability } = useQuery({
        queryKey: ['public-api', '/api/v1/auth/oauth'],
        queryFn: async ({ signal }) => zOAuthAvailability.parse(await api('/api/v1/auth/oauth', { signal }).json()),
        enabled: !user,
        staleTime: Infinity,
    });

    // Resolve enabled providers once for both section visibility and button rendering.
    const availableOAuthProviders = oauthProviders.filter((provider) => oauthAvailability?.[provider.availability]);

    const form = useForm<LoginValues>({
        defaultValues: { email: searchParams.get('email') ?? '', password: '' },
        resolver: zodResolver(loginSchema),
    });

    const trimmedEmail = useWatch({ control: form.control, name: 'email' }).trim();
    const registerSearch = trimmedEmail ? `?${new URLSearchParams({ email: trimmedEmail })}` : '';

    useEffect(() => {
        if (oauthError) {
            reportApiError(new ApiError('Unable to sign in with this provider. Please try again.', 400));
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

    return (
        <AuthLayout title="Sign in to LongLink" description="Access your organizations and manage your Solutions.">
            <Seo
                title="Sign In | LongLink"
                description="Sign in to LongLink to access your organizations and build, deploy, and manage your business process Solutions."
            />
            <Stack gap={4}>
                <Stack gap={2}>
                    {availableOAuthProviders.length > 0 ? (
                        <Stack gap={2}>
                            <Divider label="Continue with social" />
                            <Stack gap={2}>
                                {availableOAuthProviders.map((provider) => (
                                    <Button
                                        key={provider.availability}
                                        label={provider.label}
                                        onClick={() => window.location.assign(provider.path)}
                                        width="100%"
                                    />
                                ))}
                            </Stack>
                            <Divider label="or sign in with email" />
                        </Stack>
                    ) : null}
                    <form
                        action={() =>
                            form.handleSubmit(async (payload) => {
                                // Clear previous identity data only after sign-in succeeds.
                                await api('/api/v1/auth/password/login', { json: payload, method: 'POST' });
                                await clearSessionQueries(queryClient);
                                void navigate('/user/organizations', { replace: true });
                            })()
                        }
                    >
                        <Stack gap={2}>
                            <Stack gap={1}>
                                <Text type="label">Email</Text>
                                <TextField
                                    control={form.control}
                                    name="email"
                                    isLabelHidden
                                    label="Email"
                                    type="email"
                                    width="100%"
                                />
                            </Stack>
                            <Stack gap={1}>
                                <Stack direction="horizontal" hAlign="between" vAlign="center">
                                    <Text type="label">Password</Text>
                                    <Link href="/auth/forgot-password" type="supporting">
                                        Forgot password?
                                    </Link>
                                </Stack>
                                <Stack className="relative">
                                    <TextField
                                        control={form.control}
                                        name="password"
                                        className="pr-10"
                                        isLabelHidden
                                        isRequired
                                        label="Password"
                                        type={isPasswordVisible ? 'text' : 'password'}
                                        width="100%"
                                    />
                                    <IconButton
                                        className="absolute right-0 top-0"
                                        icon={isPasswordVisible ? <EyeOff /> : <Eye />}
                                        label={isPasswordVisible ? 'Hide password' : 'Show password'}
                                        onClick={() => {
                                            // Toggle visibility without changing the password value.
                                            setIsPasswordVisible((visible) => !visible);
                                        }}
                                        tooltip={isPasswordVisible ? 'Hide password' : 'Show password'}
                                        type="button"
                                        variant="ghost"
                                    />
                                </Stack>
                            </Stack>
                            <Button label="Sign In" type="submit" variant="primary" width="100%" />
                        </Stack>
                    </form>
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
