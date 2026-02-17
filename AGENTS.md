# AGENTS.md

The project is divided into three folders:

- `api` - Backend API - FastAPI application
- `sdk` - Python SDK for app development
- `web` - Static Frontend web application

# API

The API is responsible for the login and management of organizations, users, modules, and data.

# WEB

## APPs & SDK

The SDK allows to create new apps for the platform with python. It

- `viavai create <app_name>`: Creates a new app scaffold.
- `viavai migrate`: Creates migration scripts for the app's database schema (Alembic and SQLAlchemy).
- `viavai dev`: Local development server with live reload.
- `viavai publish`: Publishes the app to the platform.

The SDK allows to create the tabs that will be visible in the web application for the app, on the app side, are python objects that return a json schema that the web app will interpret and render.
