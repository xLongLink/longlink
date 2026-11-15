import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { AuthLayout } from './auth-layout';
import { useQuery } from '@tanstack/react-query';
import { useSubmit } from '@/lib/hooks/use-submit';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { FieldError } from '@/components/shadcn/field';
import { Navigate, useSearchParams } from 'react-router';
import { Button } from '@/components/longlink/action/button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { zConsent, zAuthorizationRedirect } from '@/lib/generated/platform-api-v1/zod.gen';

/** Reuses browser login before asking for explicit, resource-specific MCP access. */
export default function McpAuthorization() {
    const [params] = useSearchParams();
    const form = useForm();
    const { data: user, isLoading: loadingUser } = useCurrentUser();
    const query = params.toString();

    const {
        data: consent,
        isLoading,
        error
    } = useQuery({
        queryKey: ['api', '/api/v1/mcp/consent', query, user?.id],
        queryFn: ({ signal }) => api(`/api/v1/mcp/consent?${query}`, { signal }).json(zConsent),
        enabled: !!user,
        retry: false
    });

    /** Posts an explicit decision; the server validates permissions and the callback again. */
    async function decide(data: FormData) {
        const decision = data.get('decision');

        if (decision !== 'allow' && decision !== 'deny') throw new Error('An explicit consent decision is required');

        // Preserve the validated request parameters and redirect contract.
        const result = await api
            .post('/api/v1/mcp/consent', { json: { ...Object.fromEntries(params), approve: decision === 'allow' } })
            .json(zAuthorizationRedirect);

        window.location.assign(result.url);
    }

    const submit = useSubmit(decide, {
        onError: () => form.setError('root', { message: 'Could not submit the decision. Please try again.' })
    });

    // Preserve only this first-party approval route across password or provider login.
    if (loadingUser) return <title>Authorize MCP | LongLink</title>;

    if (!user) {
        return <Navigate replace to={`/login?${new URLSearchParams({ return_to: `/mcp/authorize?${query}` })}`} />;
    }

    // Keep the existing standalone authentication shell and its 384px content budget.
    return (
        <AuthLayout title="Authorize MCP access" description={null}>
            <title>Authorize MCP | LongLink</title>
            {isLoading ? <p>Loading authorization request…</p> : null}
            {error ? <p>This request is invalid or you do not have access to the Solution.</p> : null}
            {consent ? (
                <form
                    onSubmit={(event) => {
                        const data = new FormData(event.currentTarget, event.nativeEvent.submitter);
                        void form.handleSubmit(async () => {
                            await submit(data);
                        })(event);
                    }}
                    aria-busy={form.formState.isSubmitting}
                >
                    <fieldset disabled={form.formState.isSubmitting} className="contents">
                        <Stack gap={4}>
                            <Stack gap={2}>
                                <p>
                                    {consent.client_name} requests access to {consent.solution_name}.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    This client uses your current Solution permissions. Permission changes apply
                                    automatically. Access expires after {Math.round(consent.expires_in / 86400)} days.
                                </p>
                                <p className="text-sm font-medium">Client callback</p>
                                <p className="text-xs text-muted-foreground break-all">{consent.redirect_uri}</p>
                                <p className="text-xs text-muted-foreground">
                                    Client names are self-reported. Approve only if you recognize this callback.
                                </p>
                            </Stack>
                            <Button
                                variant="default"
                                style={{ width: '100%' }}
                                type="submit"
                                name="decision"
                                value="allow"
                            >
                                Allow access
                            </Button>
                            <Button
                                variant="outline"
                                style={{ width: '100%' }}
                                type="submit"
                                name="decision"
                                value="deny"
                            >
                                Deny
                            </Button>
                        </Stack>
                    </fieldset>
                    <FieldError errors={[form.formState.errors.root]} />
                </form>
            ) : null}
        </AuthLayout>
    );
}
