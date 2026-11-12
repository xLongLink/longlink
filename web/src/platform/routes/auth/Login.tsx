import { z } from 'zod';
import { TextField } from './Field';
import { AuthLayout } from './AuthLayout';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useEffect, useState } from 'react';
import { Link } from '@/components/astryx/Link';
import { Text } from '@/components/astryx/Text';
import { Stack } from '@/components/astryx/Stack';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/astryx/Button';
import { useForm, useWatch } from 'react-hook-form';
import { Divider } from '@/components/astryx/Divider';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { zodResolver } from '@hookform/resolvers/zod';
import { clearSessionQueries } from '@/lib/react-query';
import { GitHubIcon } from '@/components/svg/GitHubIcon';
import { GoogleIcon } from '@/components/svg/GoogleIcon';
import { emailSchema, passwordSchema } from './validation';
import { IconButton } from '@/components/astryx/IconButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { zOAuthAvailability } from '@/lib/generated/platform-api-v1/zod.gen';

const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

type LoginValues = z.infer<typeof loginSchema>;

const oauthProviders = [
    { availability: 'google', label: 'Continue with Google', path: '/api/v1/auth/oauth/google', icon: GoogleIcon },
    { availability: 'github', label: 'Continue with GitHub', path: '/api/v1/auth/oauth/github', icon: GitHubIcon },
] as const;

/** Renders the standalone account sign-in page. */
export default function Login() {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const reportApiError = useApiError();
    const oauthError = searchParams.get('oauth_error') === '1';
    const requestedReturn = searchParams.get('return_to');

    // Continue only to the first-party MCP approval route, never a client-supplied external URL.
    const destination = requestedReturn?.startsWith('/mcp/authorize?') ? requestedReturn : '/user/organizations';
    const { data: user, refetch } = useCurrentUser();

    const { data: oauthAvailability } = useQuery({
        queryKey: ['public-api', '/api/v1/auth/oauth'],
        queryFn: ({ signal }) => api('/api/v1/auth/oauth', { signal }).json(zOAuthAvailability),
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
                <title>LongLink</title>
                <Navigate replace to={destination} />
            </>
        );
    }

    return (
        <AuthLayout
            title={
                <Text display="block" justify="center" size="2xl" textWrap="nowrap" type="inherit">
                    Welcome to LongLink
                </Text>
            }
            description={null}
        >
            <title>Sign In | LongLink</title>
            <Stack gap={4}>
                <Divider />
                <Stack gap={2}>
                    <form
                        action={() =>
                            form.handleSubmit(async (payload) => {
                                // Keep failed submissions in the form instead of the page error boundary.
                                try {
                                    await api('/api/v1/auth/password/login', { json: payload, method: 'POST' });
                                } catch (cause: unknown) {
                                    reportApiError(cause);

                                    return;
                                }

                                // Refresh the persistent identity observer only after sign-in succeeds.
                                await clearSessionQueries(queryClient);
                                await refetch();
                                void navigate(destination, { replace: true });
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
                                        controlClassName="pr-10"
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
                            <Button
                                icon={<LogIn aria-hidden="true" size={16} />}
                                label="Sign In"
                                type="submit"
                                variant="primary"
                                width="100%"
                            />
                        </Stack>
                    </form>
                    {availableOAuthProviders.length > 0 ? (
                        <Stack gap={2}>
                            <Divider label="or" />
                            <Stack gap={2}>
                                {availableOAuthProviders.map((provider) => (
                                    <Button
                                        key={provider.availability}
                                        icon={<provider.icon aria-hidden="true" className="size-4 shrink-0" />}
                                        label={provider.label}
                                        onClick={() =>
                                            window.location.assign(
                                                `${provider.path}?${new URLSearchParams({ return_to: destination })}`
                                            )
                                        }
                                        width="100%"
                                    />
                                ))}
                            </Stack>
                        </Stack>
                    ) : null}
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
