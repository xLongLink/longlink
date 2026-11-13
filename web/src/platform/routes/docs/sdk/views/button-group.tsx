import { redirect } from 'react-router';

/** Redirects the former group reference to the consolidated Buttons page. */
export function loader() {
    // Preserve existing documentation links.
    return redirect('/docs/sdk/views/buttons/', 301);
}
