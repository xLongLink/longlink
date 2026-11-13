import { z } from 'zod';
import { TextField } from './field';
import { api, ApiError } from '@/lib/api';
import { AuthLayout } from './auth-layout';
import { useApiError } from '@/lib/errors';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { useForm, useWatch } from 'react-hook-form';
import { Divider } from '@/components/custom/divider';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { zodResolver } from '@hookform/resolvers/zod';
import { clearSessionQueries } from '@/lib/react-query';
import { Separator } from '@/components/shadcn/separator';
import { GoogleIcon } from '@/components/svg/google-icon';
import { emailSchema, passwordSchema } from './validation';
import { GitHubIcon } from '@/components/svg/git-hub-icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeText as Text } from '@/components/custom/native-text';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { zOAuthAvailability } from '@/lib/generated/platform-api-v1/zod.gen';

const loginSchema = z.object({ email: emailSchema, password: passwordSchema });

type LoginValues = z.infer<typeof loginSchema>;

const oauthProviders = [
    { availability: 'google', label: 'Continue with Google', path: '/api/v1/auth/oauth/google', icon: GoogleIcon },
    { availability: 'github', label: 'Continue with GitHub', path: '/api/v1/auth/oauth/github', icon: GitHubIcon }
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
        staleTime: Infinity
    });

    // Resolve enabled providers once for both section visibility and button rendering.
    const availableOAuthProviders = oauthProviders.filter((provider) => oauthAvailability?.[provider.availability]);

    const form = useForm<LoginValues>({
        defaultValues: { email: searchParams.get('email') ?? '', password: '' },
        resolver: zodResolver(loginSchema)
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
            <div className="flex flex-col gap-4">
                <Separator />
                <div className="flex flex-col gap-2">
                    <form
                        noValidate
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
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-1">
                                <Text type="label">Email</Text>
                                <TextField control={form.control} name="email" labelHidden label="Email" type="email" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <Text type="label">Password</Text>
                                    <Link
                                        to="/auth/forgot-password"
                                        className="text-[length:var(--text-supporting-size)] leading-(--text-supporting-leading) font-(--text-supporting-weight) text-(--color-text-accent) no-underline hover:underline focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-(--focus-outline-color) focus-visible:outline-solid focus-visible:outline-offset-(--focus-outline-offset)"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative flex flex-col">
                                    <TextField
                                        control={form.control}
                                        name="password"
                                        className="pr-10"
                                        labelHidden
                                        required
                                        label="Password"
                                        type={isPasswordVisible ? 'text' : 'password'}
                                    />
                                    <button
                                        className="absolute start-auto end-0 top-0 inline-flex size-(--size-element-md) cursor-pointer items-center justify-center rounded-(--radius-element) border-0 bg-transparent p-0 text-(--color-text-primary) hover:bg-(--color-overlay-hover) active:bg-(--color-overlay-pressed) focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-(--focus-outline-color) focus-visible:outline-solid focus-visible:outline-offset-(--focus-outline-offset)"
                                        aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                                        onClick={() => {
                                            // Toggle visibility without changing the password value.
                                            setIsPasswordVisible((visible) => !visible);
                                        }}
                                        title={isPasswordVisible ? 'Hide password' : 'Show password'}
                                        type="button"
                                    >
                                        {isPasswordVisible ? (
                                            <EyeOff aria-hidden="true" size={16} />
                                        ) : (
                                            <Eye aria-hidden="true" size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <Button className="w-full max-w-full" type="submit" variant="default">
                                <LogIn aria-hidden="true" size={16} />
                                Sign In
                            </Button>
                        </div>
                    </form>
                    {availableOAuthProviders.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            <Divider label="or" />
                            <div className="flex flex-col gap-2">
                                {availableOAuthProviders.map((provider) => (
                                    <Button
                                        key={provider.availability}
                                        className="w-full max-w-full"
                                        variant="secondary"
                                        type="button"
                                        onClick={() =>
                                            window.location.assign(
                                                `${provider.path}?${new URLSearchParams({ return_to: destination })}`
                                            )
                                        }
                                    >
                                        <provider.icon aria-hidden="true" className="size-4 shrink-0" />
                                        {provider.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                <Divider
                    label={
                        <>
                            New to LongLink?{' '}
                            <Link
                                to={`/auth/register${registerSearch}`}
                                className="font-medium text-(--color-text-accent) no-underline hover:underline focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-(--focus-outline-color) focus-visible:outline-solid focus-visible:outline-offset-(--focus-outline-offset)"
                            >
                                Create account
                            </Link>
                        </>
                    }
                />
            </div>
        </AuthLayout>
    );
}
