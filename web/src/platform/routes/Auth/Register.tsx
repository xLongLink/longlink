import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useSearchParams } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { useMutation } from '@tanstack/react-query';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { requestApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AuthPage } from '@/components/AuthPage';
import { Wordmark } from '@/components/Wordmark';
import { platformApiPath } from '@/lib/platform-api';

type RegisterValues = {
    email: string;
};

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const showToast = useToast();
    const [searchParams] = useSearchParams();
    const initialEmail = searchParams.get('email') ?? '';
    const schema = z.object({
        email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    });
    const form = useForm<RegisterValues>({
        defaultValues: { email: initialEmail },
        resolver: zodResolver(schema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const signInHref = email ? `/organizations?${new URLSearchParams({ email })}` : '/organizations';
    const registration = useMutation({
        mutationFn: async (payload: RegisterValues) => {
            await requestApi(platformApiPath('/auth/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
        onSuccess: () => {
            showToast({ body: 'If this email can be registered, a registration link is on the way.', type: 'info' });
        },
        onError: () => {
            showToast({ body: 'Could not send the registration link. Try again shortly.', type: 'error' });
        },
    });

    return (
        <AuthPage
            title={
                <HStack as="span" gap={2} hAlign="center" vAlign="center" wrap="wrap">
                    <Text color="inherit" type="inherit">
                        Welcome to
                    </Text>
                    <Wordmark size="heading" />
                </HStack>
            }
            description={<Divider label="Please enter your email" />}
        >
            <Stack gap={3}>
                <Stack as="form" gap={3} onSubmit={form.handleSubmit((values) => registration.mutate(values))}>
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
                        isLoading={registration.isPending}
                        label={registration.isPending ? 'Sending registration link...' : 'Send registration link'}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
                <Divider
                    label={
                        <>
                            Already have an account?{' '}
                            <Link href={signInHref} type="inherit" weight="medium">
                                Sign In
                            </Link>
                        </>
                    }
                />
            </Stack>
        </AuthPage>
    );
}
