---
name: api
description: LongLink control-plane API
---

## Structure

```text
api/
├── src/
│   ├── __init__.py
│   ├── auth.py                  # Auth helpers
│   ├── constants.py             # Shared constants
│   ├── env.py                   # Environment config
│   ├── db/                      # Database session, models, services
│   │   └── session.py
│   ├── models/                  # Domain models
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── compute.py
│   │   ├── pages.py
│   │   └── users.py
│   ├── pages/                   # XML page definitions
│   │   └── example.xml
│   ├── routes/                  # API routes
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── auth.py
│   │   ├── compute.py
│   │   ├── example.py
│   │   ├── organizations.py
│   │   ├── pages.py
│   │   ├── proxies.py
│   │   └── users.py
│   ├── templates/               # Kubernetes and infra templates
│   │   ├── application.yml
│   │   ├── ingress.yml
│   │   └── router.yml
│   └── utils/                   # Shared helpers
│       ├── __init__.py
│       ├── compute.py
│       ├── database.py
│       ├── kubectl.py
│       ├── storage.py
│       └── utils.py
├── main.py                       # FastAPI entry
└── tests/                        # Tests
```

## Organization

- Support for multi organization
- The first page is dedicated to the user

```
https://longlink.dev/{org}?tab=tab
```

## Application

```
https://longlink.dev/{org}/{application}?tab=tab
```
