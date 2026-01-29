export function OrganizationPlaceholder({ title }: { title: string }) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-white/60">
                This section will surface {title.toLowerCase()} updates for your
                organization.
            </p>
        </div>
    );
}

export default OrganizationPlaceholder;
