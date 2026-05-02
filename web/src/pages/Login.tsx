import { Layers } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getApiBaseUrl } from '@/lib/api';
import { useUser } from '@/hooks/use-user';

export default function Login() {
    const navigate = useNavigate();
    const { data: user, isLoading } = useUser();
    const apiBaseUrl = getApiBaseUrl();

    /* Redirect authenticated users or hand off to the identity provider. */
    useEffect(() => {
        if (!isLoading) {
            if (user) {
                navigate('/');
            } else {
                window.location.href = `${apiBaseUrl}/login/oidc`;
            }
        }
    }, [isLoading, navigate, user, apiBaseUrl]);

    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                    <Layers className="h-6 w-6" />
                </div>
                <p className="text-white/60">Redirecting to identity provider...</p>
            </div>
        </div>
    );
}
