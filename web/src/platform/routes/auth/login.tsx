import { z } from 'zod';
import { TextField } from './field';
import { api, ApiError } from '@/lib/api';
import { AuthLayout } from './auth-layout';
import { useApiError } from '@/lib/errors';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import { useForm, useWatch } from 'react-hook-form';
import { GitHubIcon } from '@/components/svg/github';
import { GoogleIcon } from '@/components/svg/google';
import { zodResolver } from '@hookform/resolvers/zod';
import { clearSessionQueries } from '@/lib/react-query';
import { Text } from '@/components/longlink/display/text';
import { Separator } from '@/components/shadcn/separator';
import { emailSchema, passwordSchema } from './validation';
import { FieldSeparator } from '@/components/shadcn/field';
import { useCurrentUser } from '@/platform/hooks/use-user';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

    const save = useSubmit(
        async (payload: LoginValues) => {
            await api('/api/v1/auth/password/login', { json: payload, method: 'POST' });
            await clearSessionQueries(queryClient);
            await refetch();
            void navigate(destination, { replace: true });
        },
        { onError: (error) => form.setError('root', { message: error.message }) }
    );

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
            headingSize={3}
            title={<span className="block text-nowrap">Welcome to LongLink</span>}
            description={null}
        >
            <title>Sign In | LongLink</title>
            <div className="flex flex-col gap-4">
                <Separator />
                <div className="flex flex-col gap-2">
                    <form noValidate onSubmit={form.handleSubmit(save)} aria-busy={form.formState.isSubmitting}>
                        <div className="flex flex-col gap-2">
                            <TextField
                                {...form.register('email')}
                                error={form.formState.errors.email?.message}
                                label="Email"
                                type="email"
                            />
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <Text size="sm" weight="medium">
                                        Password
                                    </Text>
                                    <Link
                                        to="/auth/forgot-password"
                                        className="text-sm leading-(--text-sm--line-height) font-normal text-primary no-underline hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-2"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative flex flex-col">
                                    <TextField
                                        {...form.register('password')}
                                        error={form.formState.errors.password?.message}
                                        className="pr-10"
                                        labelHidden
                                        required
                                        label="Password"
                                        type={isPasswordVisible ? 'text' : 'password'}
                                    />
                                    <button
                                        className="absolute start-auto end-0 top-0 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-0 text-foreground hover:bg-muted active:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-2"
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
                            <Button className="w-full max-w-full" type="submit" variant="primary">
                                <LogIn aria-hidden="true" size={16} />
                                Sign In
                            </Button>
                        </div>
                    </form>
                    {availableOAuthProviders.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            <FieldSeparator>or</FieldSeparator>
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

                <FieldSeparator>
                    New to LongLink?{' '}
                    <Link
                        to={`/auth/register${registerSearch}`}
                        className="font-medium text-primary no-underline hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-2"
                    >
                        Create account
                    </Link>
                </FieldSeparator>
            </div>
        </AuthLayout>
    );
}
