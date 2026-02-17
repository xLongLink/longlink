# AGENTS.md

The project is divided into three folders:

- `api` - Backend API - FastAPI application
- `sdk` - Python SDK for app development
- `web` - Static Frontend web application

# API

The API is responsible for the login and management of organizations, users, modules, and data.
It act as a proxy between the frontend and the applications

# WEB

The `web` folder is a bun vite tailwindcss shadcn/ui application that serves as the frontend for the platform:
It is responsible for rendering the user interface and communicating with the API to fetch and display data.

# SDK

The SDK allows to create new apps for the platform with python.

- `viavai create <app_name>`: Creates a new app scaffold.
- `viavai migrate`: Creates migration scripts for the app's database schema (Alembic and SQLAlchemy).
- `viavai publish`: Publishes the app to the platform.

The SDK allows to create the tabs that will be visible in the web application for the app, on the app side, are python objects that return a json schema that the web app will interpret and render.

## Testing

For the time being, DO NOT WRITE ANY TEST CASE
