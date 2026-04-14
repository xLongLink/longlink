# ReactXML

Create a XML abstraction layer on top of React, so that the UI becomes a pure client of a rest API. This allows for a clear Separation of Concerns:
- Backend (REST API) → owns data + mutations
- XML layer → defines data flow + UI structure
- React runtime → purely renders + executes

Designed for: 
- Internal dashboards (Data-heavy: tables, forms, filters)
- admin panels
- moderation tools
- back-office systems
- CRUD-dominant workflows
- Repetitive UI patterns
- Low tolerance for inconsistency
- High need for rapid iteration


```xml
<Query id="users" path="/users?active=true&age>18&sort=ascending" />
<For each="users" as="user">
  <State id="form" username="{user.username}" password="{user.password}">
    <Card>
      <CardHeader>
        <CardTitle>{user.title}</CardTitle>
        <CardDescription if="{user.admin}">
            <Badge> Admin <Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input kind="text" label="Username" bind="form.username"/>
        <Input kind="password" label="Password" bind="form.password" />
        <Button action="submit" path="/users/{user.id}" body="{ 'username': form.username, 'password': form.password }" invalidate="users">
            Save
        </Button>
      </CardContent>
    </Card>
  </State>
</For>
```

## Features
- Global state using `zustand`
- Conditional rendering `if`
- 
- Logic Components: 
    - `<For>`
    - `<State>`
    - `<Query>` use TanStack Query
