import { apiUrl } from '@/lib/api';
import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Bridges the browser OIDC callback back to the API auth handler. */
export default function AuthOidc() {
    const location = useLocation();

    useEffect(() => {
        // Forward the provider callback to the API so it can finish the login exchange.
        window.location.replace(apiUrl(`/auth/oidc${location.search}`));
    }, [location.search]);

    return null;
}
