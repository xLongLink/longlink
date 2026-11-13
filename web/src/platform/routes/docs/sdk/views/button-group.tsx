import { Navigate } from 'react-router';

/** Redirects the former group reference to the consolidated Buttons page. */
export default function ButtonGroup() {
    return <Navigate to="/docs/sdk/views/buttons/" replace />;
}
