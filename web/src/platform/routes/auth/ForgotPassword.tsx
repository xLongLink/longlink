import { api } from '@/lib/api';
import { AuthLayout } from './AuthLayout';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { TextInput } from '@astryxdesign/core/TextInput';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { emailPayloadSchema, type EmailPayload } from './validation';

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const showToast = useToast();
    const form = useForm({
        defaultValues: { email: '' },
        validationLogic: revalidateLogic(),
        validators: { onDynamic: emailPayloadSchema },
        onSubmit: ({ value }) => requestReset.mutate(value),
    });
    const requestReset = useMutation({
        mutationFn: (payload: EmailPayload) => api('/api/v1/auth/forgot-password', { json: payload, method: 'POST' }),
        onError: (error) => {
            showToast({
                body: error instanceof Error ? error.message : 'Please try again in a moment.',
                type: 'error',
            });
        },
    });

    return (
        <AuthLayout
            title="Reset your password"
            description="Enter your account email and LongLink will send password reset instructions."
        >
            {requestReset.isSuccess ? (
                <Stack gap={4}>
                    <Banner
                        status="success"
                        title="If an account exists for that email, password reset instructions are on the way."
                    />
                    <Button href="/login" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <>
                    <Stack
                        as="form"
                        gap={4}
                        onSubmit={(event) => {
                            event.preventDefault();
                            void form.handleSubmit();
                        }}
                    >
                        <form.Field
                            name="email"
                            children={(field) => (
                                <TextInput
                                    {...{ autoComplete: 'email' }}
                                    htmlName="email"
                                    isRequired
                                    label="Email"
                                    onBlur={field.handleBlur}
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
                        <Button
                            isLoading={requestReset.isPending}
                            label="Send reset email"
                            type="submit"
                            variant="primary"
                        />
                    </Stack>
                    <Text as="p" color="secondary" justify="center" type="supporting">
                        <Link href="/login" type="inherit" weight="medium">
                            Back to sign in
                        </Link>
                    </Text>
                </>
            )}
        </AuthLayout>
    );
}
