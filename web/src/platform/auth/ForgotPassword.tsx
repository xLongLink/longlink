import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { fetchApiVoid } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AuthPage } from '@/components/AuthPage';
import { platformApiPath } from '@/lib/platform-api';

type ForgotPasswordValues = {
    email: string;
};

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const showToast = useToast();
    const schema = z.object({
        email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    });
    const form = useForm<ForgotPasswordValues>({
        defaultValues: { email: '' },
        resolver: zodResolver(schema),
    });
    const requestReset = useMutation({
        mutationFn: (payload: ForgotPasswordValues) =>
            fetchApiVoid(platformApiPath('/auth/forgot-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
        onError: (error) => {
            showToast({
                body: error instanceof Error ? error.message : 'Please try again in a moment.',
                type: 'error',
            });
        },
    });

    return (
        <AuthPage
            title="Reset your password"
            description="Enter your account email and LongLink will send password reset instructions."
        >
            {requestReset.isSuccess ? (
                <Stack gap={4}>
                    <Banner
                        status="success"
                        title="If an account exists for that email, password reset instructions are on the way."
                    />
                    <Button href="/organizations" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <Stack as="form" gap={4} onSubmit={form.handleSubmit((values) => requestReset.mutate(values))}>
                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...{ autoComplete: 'email' }}
                                ref={field.ref}
                                htmlName={field.name}
                                isRequired
                                label="Email"
                                onBlur={field.onBlur}
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
                    <Button
                        isLoading={requestReset.isPending}
                        label={requestReset.isPending ? 'Sending reset email...' : 'Send reset email'}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
            )}
            {!requestReset.isSuccess ? (
                <Text as="p" color="secondary" justify="center" type="supporting">
                    <Link href="/organizations" type="inherit" weight="medium">
                        Back to sign in
                    </Link>
                </Text>
            ) : null}
        </AuthPage>
    );
}
