import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useNavigate, useSearchParams } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { Divider } from '@/components/ui/Divider';
import { WelcomeTitle } from '@/components/WelcomeTitle';
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
    const queryClient = useQueryClient();
    const showToast = useToast();
    const form = useForm<LoginValues>({
        defaultValues: { email: searchParams.get('email') ?? '', password: '' },
        resolver: zodResolver(loginSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const registerHref = email ? `/auth/register?${new URLSearchParams({ email })}` : '/auth/register';
    const login = useMutation({
        mutationFn: (payload: LoginValues) => api('/api/v1/auth/password/login', { json: payload, method: 'POST' }),
    });

    /** Signs in with an email and password, then refreshes the current profile. */
    async function handlePasswordSignIn(payload: LoginValues) {
        try {
            await login.mutateAsync(payload);
            await queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me'] });
            navigate('/user/organizations', { replace: true });
        } catch (loginError) {
            showToast({
                body: loginError instanceof Error ? loginError.message : 'Sign in failed',
                type: 'error',
            });
        }
    }

    return (
        <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px))" width="100%">
            <Stack gap={4} maxWidth={384} width="100%">
                <Stack gap={1} hAlign="center">
                    <Heading level={1} justify="center">
                        <WelcomeTitle />
                    </Heading>
                    <Divider>{'Sign in with your email and password.'}</Divider>
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
        </Center>
    );
}
