import { z } from 'zod';
import { AuthLayout } from './AuthLayout';
import { api, ApiError } from '@/lib/api';
import { useNavigate } from 'react-router';
import { TermsNotice } from './TermsNotice';
import { useEffect, useState } from 'react';
import { passwordSchema } from './validation';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Divider } from '@/components/ui/Divider';
import { Button } from '@astryxdesign/core/Button';
import { clearSessionQueries } from '@/lib/react-query';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zEmailPayload, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

const REGISTRATION_TOKEN_KEY = 'longlink.registration.token';
const registrationCompleteSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters'),
    password: passwordSchema,
});

type RegistrationCompleteValues = z.infer<typeof registrationCompleteSchema>;
type RegistrationSetup = z.infer<typeof zEmailPayload>;

/** Verifies an emailed registration link before collecting account credentials. */
export default function VerifyEmail() {
    const showToast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const token = useFragmentToken(REGISTRATION_TOKEN_KEY);
    const [lastVerifiedSetup, setLastVerifiedSetup] = useState<RegistrationSetup | null>(null);
    const form = useForm({
        defaultValues: { name: '', password: '' },
        validationLogic: revalidateLogic(),
        validators: { onDynamic: registrationCompleteSchema },
        onSubmit: ({ value }) => handleComplete(value),
    });
    const verification = useMutation({
        mutationFn: async (registrationToken: string) => {
            if (!registrationToken) {
                return zEmailPayload.parse(await api('/api/v1/auth/register/setup').json());
            }

            const response = await api('/api/v1/auth/verify', { json: { token: registrationToken }, method: 'POST' });

            return zEmailPayload.parse(await response.json());
        },
        onSuccess: (setup) => {
            setLastVerifiedSetup(setup);
        },
        onError: (error) => {
            // Invalid credentials cannot become valid through another retry.
            if (error instanceof ApiError && error.status === 400) {
                sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            }
        },
    });
    const completion = useMutation({
        mutationFn: async (payload: RegistrationCompleteValues) => {
            const response = await api('/api/v1/auth/register/complete', {
                json: { ...payload, email: verification.data?.email },
                method: 'POST',
            });

            return zUserSummary.parse(await response.json());
        },
    });
    const { mutate: verifyToken } = verification;
    /** Creates the account and publishes only the new authenticated query state. */
    async function handleComplete(payload: RegistrationCompleteValues) {
        try {
            const user = await completion.mutateAsync(payload);

            await clearSessionQueries(queryClient);
            queryClient.setQueryData(['api', '/api/v1/me'], user);
            sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            navigate('/user/organizations', { replace: true });
        } catch (error) {
            // Expired setup cookies move the page into the terminal replacement-link state.
            if (error instanceof ApiError && error.status === 400) {
                verification.mutate('');
            }
            if (error instanceof ApiError && error.status === 409) {
                return;
            }

            showToast({
                body: error instanceof ApiError ? error.message : 'error',
                type: 'error',
            });
        }
    }

    useEffect(() => {
        verifyToken(token);
    }, [token, verifyToken]);

    const recoverySetup = verification.data ?? lastVerifiedSetup;
    const recoverySearch = recoverySetup?.email ? `?${new URLSearchParams({ email: recoverySetup.email })}` : '';
    const recoveryRegisterHref = `/auth/register${recoverySearch}`;
    const completionError = completion.error instanceof ApiError ? completion.error : null;

    // Keep transient verification failures retryable while expired credentials remain terminal.
    if (verification.error) {
        const verificationError = verification.error instanceof ApiError ? verification.error : null;
        const invalidToken = verificationError?.status === 400;

        return (
            <AuthLayout title="Verify your email" description={verificationError?.message ?? 'error'}>
                <Stack gap={3}>
                    {invalidToken ? null : (
                        <Button label="Retry" onClick={() => verification.mutate(token)} variant="primary" />
                    )}
                    <Button href={recoveryRegisterHref} label="Request a new registration link" />
                </Stack>
            </AuthLayout>
        );
    }

    // Wait for the server to authenticate the signed email claim.
    if (!verification.data) {
        return (
            <AuthLayout title="Verify your email" description="Verifying your email...">
                <Button isLoading label="Verifying your email..." variant="primary" />
            </AuthLayout>
        );
    }

    // Account races and cross-tab setup changes cannot succeed by resubmitting the same form.
    if (completionError?.status === 409) {
        return (
            <AuthLayout title="Complete your account" description={completionError?.message ?? 'error'}>
                <Button href={recoveryRegisterHref} label="Request a new registration link" />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title={<WelcomeTitle />}
            description={<Divider>{'Email verified. Complete your profile.'}</Divider>}
        >
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
                        name="name"
                        children={(field) => (
                            <TextInput
                                {...{ autoComplete: 'name' }}
                                hasAutoFocus
                                htmlName="name"
                                isRequired
                                label="Name"
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                                status={
                                    field.state.meta.errors.length > 0
                                        ? { type: 'error', message: field.state.meta.errors[0]?.message }
                                        : undefined
                                }
                                value={field.state.value}
                                width="100%"
                            />
                        )}
                    />
                    <form.Field
                        name="password"
                        children={(field) => (
                            <TextInput
                                htmlName="password"
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
                    <Button isLoading={completion.isPending} label="Create account" type="submit" variant="primary" />
                </Stack>
                <Divider />
                <TermsNotice />
            </Stack>
        </AuthLayout>
    );
}
