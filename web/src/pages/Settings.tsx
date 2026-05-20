import Layout from '@/Layout';
import { useUser } from '@/hooks/use-user';
import { Menu, MenuSection, MenuSubSection } from '@ui/menu';
import { Link } from 'react-router';

/** Renders the authenticated settings page. */
export default function Settings() {
    const { data: user } = useUser();
    const organizations = user?.organizations ?? [];

    return (
        <Layout tabs={{ Organizations: '/organizations', Settings: '/settings' }}>
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
                    <p className="text-sm text-white/60">Manage your account, preferences, and workspace access.</p>
                </div>

                <Menu defaultValue="profile" className="items-start">
                    <MenuSection value="profile" label="Profile">
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-white">Profile</h2>
                            <p className="text-sm text-white/60">
                                Update the details people see when they interact with your LongLink account.
                            </p>
                        </div>

                        <MenuSubSection value="account" label="Account">
                            <div className="space-y-4">
                                <h2 className="text-lg font-medium text-white">Account</h2>
                                <p className="text-sm text-white/60">
                                    Change your email address, password, and sign-in preferences.
                                </p>
                            </div>
                        </MenuSubSection>

                        <MenuSubSection value="appearance" label="Appearance">
                            <div className="space-y-4">
                                <h2 className="text-lg font-medium text-white">Appearance</h2>
                                <p className="text-sm text-white/60">Adjust the look and feel of the interface.</p>
                            </div>
                        </MenuSubSection>

                        <MenuSubSection value="notifications" label="Notifications">
                            <div className="space-y-4">
                                <h2 className="text-lg font-medium text-white">Notifications</h2>
                                <p className="text-sm text-white/60">
                                    Choose which updates and alerts you want to receive.
                                </p>
                            </div>
                        </MenuSubSection>
                    </MenuSection>

                    <MenuSection value="organizations" label="Organizations">
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-white">Organizations</h2>
                            <p className="text-sm text-white/60">
                                Review the organizations connected to your personal account.
                            </p>

                            <div className="space-y-2">
                                {organizations.length ? (
                                    organizations.map((organization) => (
                                        <div key={organization.name} className="flex items-center justify-between gap-3">
                                            <span className="text-sm text-white">{organization.name}</span>
                                            <Link to="/organizations" className="text-sm text-accent hover:underline">
                                                Manage
                                            </Link>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-white/60">No organizations available.</p>
                                )}
                            </div>
                        </div>
                    </MenuSection>

                    <MenuSection value="developer-settings" label="Developer Settings">
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-white">Developer Settings</h2>
                            <p className="text-sm text-white/60">
                                Configure developer access, integrations, and API-related preferences.
                            </p>
                        </div>
                    </MenuSection>
                </Menu>
            </section>
        </Layout>
    );
}
