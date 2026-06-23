import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-05-27',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/index.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="longlink" level="h1">
            LongLink
        </Heading>
        <p className="leading-7">LongLink is a platform for building and running structured business applications.</p>
        <p className="leading-7">
            It is designed for internal tools, workflow systems, approval flows, data management interfaces, CRM-like
            applications, and other software where people need to work with data, follow processes, and keep operations
            under control.
        </p>
        <p className="leading-7">
            Most business applications share the same foundation. They need users, permissions, forms, validation,
            routing, logs, storage, deployment, and a way for people to interact with the data. LongLink provides this
            common foundation once, inside a shared platform, so every application does not have to rebuild it from
            scratch.
        </p>
        <p className="leading-7">
            Applications are still built as full-code Python services. This means developers keep control over the
            business logic, data rules, integrations, and behavior of the application. LongLink provides the structure
            around the application, while the application itself stays focused on the specific problem it solves.
        </p>
        <p className="leading-7">
            The result is a simpler way to build operational software: less repeated infrastructure, clearer application
            boundaries, better visibility, and lower development and maintenance cost.
        </p>
        <Heading id="why" level="h2">
            Why
        </Heading>
        <p className="leading-7">
            Business software often becomes expensive because every application is treated as a separate system.
        </p>
        <p className="leading-7">
            Each project needs its own backend structure, access control, interface, deployment setup, logging, data
            handling, and operational logic. Over time, this creates duplicated work, inconsistent patterns, and
            applications that are harder to maintain.
        </p>
        <p className="leading-7">LongLink was created to reduce that complexity.</p>
        <p className="leading-7">
            The platform handles the common layer once. Applications only need to implement what makes them specific:
            their business logic, validation rules, workflows, data models, and integrations. When a process changes, a
            regulation changes, or a business rule needs to be updated, developers can focus on the application logic
            instead of navigating a large amount of unrelated infrastructure code.
        </p>
        <p className="leading-7">
            This makes applications faster to build, easier to understand, and cheaper to maintain. It also gives teams
            better visibility and control, because applications run inside one coordinated platform instead of being
            scattered across separate custom systems.
        </p>
        <p className="leading-7">
            LongLink is especially useful when building with AI-assisted development. Code can be produced quickly, but
            it still needs a clear structure to remain reliable. LongLink gives developers and AI a defined foundation
            to build on, so speed does not come at the cost of consistency.
        </p>
    </div>
);
