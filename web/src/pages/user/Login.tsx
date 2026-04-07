import { ArrowRight, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import { useUser } from '@/hooks/use-user';

type LoginMethodsResponse = string[] | { methods?: string[] };

export default function Login() {
    const navigate = useNavigate();
    const { data: user, isLoading } = useUser();
    const apiBaseUrl = getApiBaseUrl();
    const [availableMethods, setAvailableMethods] = useState<string[]>([]);

    const getDefaultReturnTo = () => {
        const referrer = document.referrer;
        if (!referrer) {
            return '/';
        }

        try {
            const referrerUrl = new URL(referrer);
            if (referrerUrl.origin !== window.location.origin) {
                return '/';
            }
            const referrerPath = `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`;
            return referrerPath.startsWith('/login') ? '/' : referrerPath;
        } catch {
            return '/';
        }
    };

    const returnTo = getDefaultReturnTo();

    useEffect(() => {
        if (!isLoading && user) {
            navigate(returnTo);
        }
    }, [isLoading, navigate, returnTo, user]);

    useEffect(() => {
        let isMounted = true;

        const loadLoginMethods = async () => {
            try {
                const data = await apiFetch<LoginMethodsResponse>('/login');
                if (isMounted) {
                    setAvailableMethods(Array.isArray(data) ? data : (data.methods ?? []));
                }
            } catch {
                if (isMounted) {
                    setAvailableMethods([]);
                }
            }
        };

        loadLoginMethods();

        return () => {
            isMounted = false;
        };
    }, []);

    const hasOidcMethod = availableMethods.includes('oidc');

    const handleOidcLogin = () => {
        window.location.href = `${apiBaseUrl}/login/oidc`;
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
            <Card className="w-full max-w-md border-white/10 bg-white/5">
                <CardHeader className="space-y-4 text-center">
                    <div className="space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                            <Layers className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl">Welcome back</CardTitle>
                        <CardDescription className="text-white/60">
                            Sign in with your organization identity provider.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 p-8 pt-0">
                    <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-3 text-sm text-blue-100">
                        <div className="flex items-center gap-2 font-medium">
                            <ShieldCheck className="h-4 w-4" />
                            OIDC secure login
                        </div>
                        <p className="mt-1 text-xs text-blue-100/80">
                            You will be redirected to the configured OpenID Connect provider to authenticate.
                        </p>
                    </div>
                    <div className="grid gap-3">
                        <Button
                            className="h-11 justify-between gap-2 bg-white text-slate-900 hover:bg-white/90"
                            disabled={!hasOidcMethod}
                            onClick={handleOidcLogin}
                        >
                            Continue with Single Sign-On
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        {!hasOidcMethod && (
                            <p className="text-center text-xs text-amber-300">
                                OIDC login is unavailable. Verify API OIDC bridge configuration.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
