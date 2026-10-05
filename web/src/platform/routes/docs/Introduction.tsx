import { Navigate } from 'react-router';

/** Preserves client-side links to the former documentation introduction. */
export default function Introduction() {
    return <Navigate replace to="/use-cases/" />;
}
