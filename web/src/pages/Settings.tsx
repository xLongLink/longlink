import Layout from '@/Layout';

/** Renders the authenticated settings page. */
export default function Settings() {
    return (
        <Layout tabs={{ Organizations: '/organizations', Settings: '/settings' }}>
            <section className="mx-auto w-full max-w-[1000px]" />
        </Layout>
    );
}
