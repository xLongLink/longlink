import { api } from '@/lib/api';
import { AuthLayout } from './AuthLayout';
import { NoIndex } from '@/components/NoIndex';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { Navigate, useSearchParams } from 'react-router';
import { zConsent, zAuthorizationRedirect } from '@/lib/generated/platform-api-v1/zod.gen';

/** Reuses browser login before asking for explicit, resource-specific MCP access. */
export default function McpAuthorization() {
    const [params] = useSearchParams();
    const { data: user, isLoading: loadingUser } = useCurrentUser();
    const query = params.toString();

    const {
        data: consent,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['api', '/api/v1/mcp/consent', query, user?.id],
        queryFn: ({ signal }) => api(`/api/v1/mcp/consent?${query}`, { signal }).json(zConsent),
        enabled: !!user,
        retry: false,
    });

    /** Posts an explicit decision; the server validates permissions and the callback again. */
    async function decide(approve: boolean) {
        const result = await api
            .post('/api/v1/mcp/consent', { json: { ...Object.fromEntries(params), approve } })
            .json(zAuthorizationRedirect);

        window.location.assign(result.url);
    }

    // Preserve only this first-party approval route across password or provider login.
    if (loadingUser) return <NoIndex title="Authorize MCP | LongLink" />;

    if (!user) {
        return <Navigate replace to={`/login?${new URLSearchParams({ return_to: `/mcp/authorize?${query}` })}`} />;
    }

    // Keep the existing standalone authentication shell and its 384px content budget.
    return (
        <AuthLayout title="Authorize MCP access" description={null}>
            <NoIndex title="Authorize MCP | LongLink" />
            {isLoading ? <Text as="p">Loading authorization request…</Text> : null}
            {error ? <Text as="p">This request is invalid or you do not have access to the Solution.</Text> : null}
            {consent ? (
                <Stack gap={4}>
                    <Stack gap={2}>
                        <Text as="p">
                            {consent.client_name} requests access to {consent.solution_name}.
                        </Text>
                        <Text as="p" type="supporting">
                            It may read and modify Solution data within your current Organization permissions. Access
                            expires after one hour.
                        </Text>
                        <Text as="p" type="label">
                            Client callback
                        </Text>
                        <Text as="p" type="supporting" className="break-all">
                            {consent.redirect_uri}
                        </Text>
                        <Text as="p" type="supporting">
                            Client names are self-reported. Approve only if you recognize this callback.
                        </Text>
                    </Stack>
                    <Button label="Allow access" variant="primary" width="100%" clickAction={() => decide(true)} />
                    <Button label="Deny" width="100%" clickAction={() => decide(false)} />
                </Stack>
            ) : null}
        </AuthLayout>
    );
}
