# AGENTS.md

You are working on LongLink, a modular project hub platform inspired by GitHub. The platform allows organizations to manage tools, processes, projects, and workflows through automation and connections. Each organization has its own database and storage space, and apps can be installed with a single click to provide specific functionalities.

The project is divided into three folders:

- `api` - Backend API - FastAPI application
- `sdk` - Python SDK for app development
- `web` - Static Frontend web application

# API

The API is responsible for the login and management of organizations, users, modules, and data.

# WEB

The web application is a static frontend built with React and Shadcn UI for consistency. It contains:

- Landing page
- Organization’s overview page /<iso_country_code>/<org_name>
- App-specific pages /<iso_country_code>/<org_name>/<app>

## APPs & SDK

The SDK allows to create new apps for the platform with python. It

- `viavai create <app_name>`: Creates a new app scaffold.
- `viavai migrate`: Creates migration scripts for the app's database schema (Alembic and SQLAlchemy).
- `viavai dev`: Local development server with live reload.
- `viavai publish`: Publishes the app to the platform.

The SDK allows to create the tabs that will be visible in the web application for the app, on the app side, are python objects that return a json schema that the web app will interpret and render.
