import { Navigate } from 'react-router';

/** Preserves existing links after moving the introduction to the blog. */
export default function Introduction() {
    return <Navigate to="/blog/why-longlink/" replace />;
}
