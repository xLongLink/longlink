# ViaVai API

- Core login of the Application.
- Handle authentication, and routing to modules.
- This shall have proper migrations and databases with Alembic and SQLAlchemy.

CREATE TABLE users (
id BIGSERIAL PRIMARY KEY,
username VARCHAR(39) UNIQUE NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
id BIGSERIAL PRIMARY KEY,
name VARCHAR(100) UNIQUE NOT NULL,
created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE organization_memberships (
user_id BIGINT REFERENCES users(id),
organization_id BIGINT REFERENCES organizations(id),
role VARCHAR(20) CHECK (role IN ('member', 'admin')),
PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE repositories (
id BIGSERIAL PRIMARY KEY,
name VARCHAR(100) NOT NULL,
owner_user_id BIGINT REFERENCES users(id),
owner_org_id BIGINT REFERENCES organizations(id),
is_private BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP NOT NULL DEFAULT now(),
CHECK (
(owner_user_id IS NOT NULL AND owner_org_id IS NULL)
OR
(owner_user_id IS NULL AND owner_org_id IS NOT NULL)
)
);

CREATE TABLE repository_user_permissions (
repository_id BIGINT REFERENCES repositories(id),
user_id BIGINT REFERENCES users(id),
permission VARCHAR(20) CHECK (
permission IN ('read', 'write', 'maintain', 'admin')
),
PRIMARY KEY (repository_id, user_id)
);

CREATE TABLE user_settings (
user_id BIGINT PRIMARY KEY REFERENCES users(id),
theme VARCHAR(20),
email_notifications BOOLEAN DEFAULT TRUE,
two_factor_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE repository_settings (
repository_id BIGINT PRIMARY KEY REFERENCES repositories(id),
issues_enabled BOOLEAN DEFAULT TRUE,
wiki_enabled BOOLEAN DEFAULT FALSE,
discussions_enabled BOOLEAN DEFAULT FALSE
);
