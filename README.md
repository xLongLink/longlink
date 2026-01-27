# ViaVai

## Goal??

A platform to manage all aspects of an organization's operations, projects, and compliance requirements, at the core:

- Version control: Built around Git repositories for source code management.
- CI/CD: Native continuous integration and continuous delivery pipelines.
- Project management: Issues, epics, milestones, and Kanban-style boards.
- Security & compliance: Static/dynamic analysis, dependency scanning, and policy controls.
- Deployment & operations: Monitoring, environments, and release management.

It can be seen as a GitHub for non-software projects, providing a unified interface to manage diverse organizational needs.

## Tools

All the internal tooling required to run an organization, such as:

- Accounting
- Human Resources
- Corporate Policy & Compliance Programs

Here are included all the tools that group multiple projects to have a higher level view of the organization.

## Repositories

All the different types of projects/objects that an organization may need to manage, such as:

- Construction & Engineering Projects
- Facilities & Asset Management
- Legal Case & Contract Management
- Product Operations
- Research & Technical Documentation Projects
- Event & Program Management
- Portfolio or Investment Management
- Patient Medical Record

### Issues

Issues are simple tickers, those can be automatically created from emails or other external systems.

### Settings

```
[ UI ]
   |
[ API Layer ]     ← transport, versioning, contracts
   |
[ Application / Domain Layer ]  ← rules, workflows, permissions
   |
[ Infrastructure Layer ]        ← DB, queues, logs
```

## View

- Logs
- Files
- Settings

## When deployed, cron shall be external

## Deployment

Mimimal:

- 256 MB RAM
- 0.5 vCPU

# https://developer.hashicorp.com/nomad

# https://developer.hashicorp.com/consul

- SDK allows to create projects
- A LongLink tool to automatically enroll users into the platform
