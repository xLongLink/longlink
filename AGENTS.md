# AGENTS.md

You are working on ViaVai, a modular project hub platform inspired by GitHub. The platform allows organizations to manage tools, processes, projects, and workflows through automation and connections. Each organization has its own database and storage space, and modules can be installed with a single click to provide specific functionalities.

The project is divided into three sections:

- `api` - Backend API - FastAPI application
- `sdk` - Python SDK for module development
- `web` - Static Frontend web application

# API

The API is responsible for the login and management of organizations, users, modules, and data.

- Each organization has a database (PostgreSQL)
- Each organization has a storage space (NAS).
- Each organization has a podman/docker service to run module-specific containers.

# WEB

The web application is a static frontend built with React and Shadcn UI for consistency. It contains:

- Landing page
- Organization’s overview page /<iso_country_code>/<org_name>
- Module-specific pages /<iso_country_code>/<org_name>/<module>

Is designed in a tab navigation style. The organizaton has predefined tabs: `Overview`, `Tools`, `Entities`, `Projects`, `Settings`.
While each module have its own sub-tabs.

## The modules

Modules is the core part of the platform. Those can be installed with a single click.

- Each module provides specific functionalities to the organization, they are divided in 3 categories:
    - `Tools`: Long living modules that provide core functionalities to the organization
    - `Entities`: Modules that represent real world entities, usually connected to a client or a supplier
    - `Projects`: Modules that represent projects, internal or external
- Each module has its own database space into the organization’s database.
- Each module has a folder in the storage space of the organization.
- Each module run in its own container, isolated from the others.

Overall is a python uvicorn application that run the logic and validation required by the module.

# SDK

The SDK allows to create new modules for the platform with python. It

- `viavai create <module_name>`: Creates a new module scaffold.
- `viavai migrate`: Creates migration scripts for the module's database schema (Alembic and SQLAlchemy).
- `viavai dev`: Local development server with live reload.
- `viavai publish`: Publishes the module to the platform.

The SDK allows to create the tabs that will be visible in the web application for the module, on the module side, are python objects that return a json schema that the web app will interpret and render.
