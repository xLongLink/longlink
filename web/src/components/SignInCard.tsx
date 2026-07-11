import { useTranslation } from '@/lib/i18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Wordmark } from '@/components/Wordmark';
import { useUser } from '@/hooks/use-user';
import { apiUrl } from '@/lib/api';
import { sanitizeRedirectPath } from '@/lib/redirects';
import { getInitials } from '@/lib/utils';

/** Renders the shared OIDC redirect sign-in card. */
export function SignInCard({ redirectTo }: { redirectTo: string }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { accounts, activateAccount } = useUser();
    const safeRedirectTo = sanitizeRedirectPath(redirectTo);

    /** Activates one saved account and returns to the requested page. */
    async function handleAccountSelect(oidc: string) {
        // Activate the saved account before redirecting.
        try {
            await activateAccount(oidc);
            navigate(safeRedirectTo, { replace: true });
        } catch (accountError) {
            toast.error(accountError instanceof Error ? accountError.message : t('auth.accountOpenFailed'));
        }
    }

    /** Redirects the browser to the OIDC login endpoint with the target path. */
    function handleProviderSignIn() {
        const redirectParameters = new URLSearchParams({ next: safeRedirectTo });

        window.location.assign(apiUrl(`/auth/login/oidc?${redirectParameters.toString()}`));
    }

    const hasSavedAccounts = accounts.items.length > 0;

    return (
        <div className="mx-auto w-full max-w-sm">
            <div className="space-y-0">
                <div className="space-y-3">
                    <div className="space-y-2 text-center">
                        <div className="space-y-2">
                            <h1 className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-2xl font-medium">
                                <span>{t('auth.welcomeTo')}</span>
                                <Wordmark className="text-2xl align-baseline" />
                            </h1>
                        </div>
                    </div>

                    <Separator className="my-2 h-px w-full border-t border-border/60" />

                    <div className="space-y-2">
                        <Button type="button" variant="outline" className="w-full" onClick={handleProviderSignIn}>
                            {t('actions.login')}
                        </Button>
                    </div>

                    <Separator className="my-2 h-px w-full border-t border-border/60" />

                    {hasSavedAccounts ? (
                        <>
                            <div className="space-y-2">
                                {accounts.items.map((account) => (
                                    <button
                                        key={account.oidc}
                                        type="button"
                                        className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border/70 px-3 py-2 text-left transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                        onClick={() => void handleAccountSelect(account.oidc)}
                                    >
                                        <Avatar className="size-9">
                                            <AvatarImage src={account.avatar} alt={`${account.name} profile`} />
                                            <AvatarFallback>{getInitials(account.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-foreground">
                                                {account.name}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <Separator className="my-2 h-px w-full border-t border-border/60" />
                        </>
                    ) : null}
                </div>
            </div>

            <p className="mx-auto max-w-sm text-center text-xs text-muted-foreground">
                <span>{t('auth.agreementLead')}</span>
                <br />
                <Link className="underline underline-offset-4 hover:text-foreground" to="/terms">
                    {t('auth.termsOfService')}
                </Link>{' '}
                {t('auth.agreementMiddle')}{' '}
                <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
                    {t('auth.privacyPolicy')}
                </Link>
                .
            </p>
        </div>
    );
}
