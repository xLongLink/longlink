import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import Tabs from '@/components/Tabs';
import View from '@/components/View';
import { useApiData } from '@/hooks/use-data';
import { useParams } from 'react-router';

type LongLinkProps = {
    path: string;
};

/**
 * Removes leading and trailing slashes from a route path.
 */
const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

/**
 * Replaces route params in a metadata path template.
 */
const resolvePath = (path: string, params: Record<string, string | undefined>) =>
    path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => params[key] ?? `:${key}`);

/**
 * Renders metadata-backed XML pages for SDK and API routes.
 */
export default function LongLink({ path }: LongLinkProps) {
    const params = useParams();
    const { '*': wildcardPath } = params;
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const metadataPath = resolvePath(path, params);
    const { data: metadata } = useApiData<{ pages?: Array<{ path: string; content?: string }> }>(metadataPath);
    const activePage = metadata?.pages?.find(
        (page) => normalizePath(page.path.replace(/\.xml$/i, '')) === normalizedRoutePath
    );

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-white/80">
                        <div className="flex items-center gap-4">
                            <Breadcrumb />
                        </div>
                        <UserProfile />
                    </div>
                </div>

                <Tabs path={metadataPath} />
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">
                    <View xmlSource={activePage?.content ?? null} />
                </section>
            </main>
        </div>
    );
}
