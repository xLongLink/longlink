import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslator } from '@astryxdesign/core/i18n';
import { AuthPage } from '@/components/AuthPage';
import { accountsQueryKey, userProfileQueryKey } from '@/lib/query-keys';
import { AUTH_RETURN_PATH_KEY, sanitizeRedirectPath } from '@/lib/redirects';

/** Refreshes session state after external authentication and returns to the saved page. */
export default function Complete() {
    const t = useTranslator();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        let active = true;
        const returnPath = sanitizeRedirectPath(sessionStorage.getItem(AUTH_RETURN_PATH_KEY));

        /** Refreshes cached session data before leaving the callback page. */
        async function completeAuthentication() {
            try {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: userProfileQueryKey() }),
                    queryClient.invalidateQueries({ queryKey: accountsQueryKey() }),
                ]);
            } finally {
                // Navigate only from the current effect instance.
                if (active) {
                    sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);
                    navigate(returnPath, { replace: true });
                }
            }
        }

        void completeAuthentication();

        return () => {
            active = false;
        };
    }, [navigate, queryClient]);

    return (
        <AuthPage title={t('auth.completingSignIn')} description={t('auth.completingSignInDescription')}>
            <Text as="p" color="secondary" justify="center" role="status" type="supporting">
                {t('auth.pleaseWait')}
            </Text>
        </AuthPage>
    );
}
