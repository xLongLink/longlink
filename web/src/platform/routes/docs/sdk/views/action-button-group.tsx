import { Navigate } from 'react-router';

/** Redirects the former action group reference to the consolidated Buttons page. */
export default function ActionButtonGroup() {
    return <Navigate to="/docs/sdk/views/buttons/" replace />;
}
