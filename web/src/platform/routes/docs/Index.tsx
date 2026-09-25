import { Navigate } from 'react-router';

/** Sends documentation visitors to the first section. */
export default function DocsIndex() {
    return <Navigate replace to="/docs/sdk/" />;
}
