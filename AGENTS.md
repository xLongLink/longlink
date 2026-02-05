# AGENTS.md

You are working on LongLink, a modular project hub platform inspired by GitHub. The platform allows organizations to manage tools, processes, projects, and workflows through automation and connections. Each organization has its own database and storage space, and apps can be installed with a single click to provide specific functionalities.

The project is divided into three sections:

- `api` - Backend API - FastAPI application
- `sdk` - Python SDK for app development
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
- App-specific pages /<iso_country_code>/<org_name>/<app>

Is designed in a tab navigation style. The organizaton has predefined tabs: `Overview`, `Tools`, `Entities`, `Projects`, `Settings`.
While each app have its own sub-tabs.

## APPs

Apps are a core part of the platform. Those can be installed with a single click.

- Each app provides specific functionalities to the organization, they are divided in 3 categories:
    - `Tools`: Long living apps that provide core functionalities to the organization
    - `Entities`: Apps that represent real world entities, usually connected to a client or a supplier
    - `Projects`: Apps that represent projects, internal or external
- Each app has its own database space into the organization’s database.
- Each app has a folder in the storage space of the organization.
- Each app run in its own container, isolated from the others.

Overall is a python uvicorn application that run the logic and validation required by the module.

A LongLink app is called VaiVai.

# SDK

The SDK allows to create new apps for the platform with python. It

- `viavai create <app_name>`: Creates a new app scaffold.
- `viavai migrate`: Creates migration scripts for the app's database schema (Alembic and SQLAlchemy).
- `viavai dev`: Local development server with live reload.
- `viavai publish`: Publishes the app to the platform.

The SDK allows to create the tabs that will be visible in the web application for the app, on the app side, are python objects that return a json schema that the web app will interpret and render.
