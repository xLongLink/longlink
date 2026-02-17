# LongLink

An Operational infrastructure for businesses

Computers were created to store and safeguard information efficiently, making it easier to access while minimizing risk and reducing operational costs.
Often in companies this is the case, informations ended up fragmented in spreadsheets, documents, emails. Originally, SASS startups have tried to solve this problem but overtime the goal has become to lock-in customers and charge them montly, resulting in an even more worse fragmentation. Small and medium companies that cannot afford to have a dedicated IT team, are often stuck with old and outdated setup, that place them in a competitive disadvantage.

The problems that need to be solved are often very simple: an Accounting, a CRM, a PMS, a DMS they can be simplified as an application with a IU, a logic layer and a database/storage layer. Often those applications have horrible UI/UX experience, they try to be flexible by creating a customization layer with a non coding interface, and they are designed to use the support plan as another monetization layer instead of providing a good documentation. Mose of the times to achive the last 5% of the requirements, strange workarounds are needed, that increase the maintenance cost and prevent scaling. SASS try to solve this by creating an ad hoc product for a specifiy nice of the market, however they have high cost because they have to create a new product from zero, that include authentication, billing, user management, backup, security, and so on.

AI has drop the cost of creating software, it shined in creating example and solving task in well structured and documented codebases. LongLink aim to simplify even further the process by providing a platform to manage `authentication`, `billing`, `user roles / RBAC`, `backup`, `audit logs`, `security policies` as an unified the UI experience. Leaving the space to apps that write the required login to follow a regulations and taxonomy of the specific industry.

In the development space this does not exist. Every new project starts by creating a new repository, and is easier to keep track of ownership and permissions related to a project. LongLink is strognly inspired by the workflow that `GitHub` has created for developers and it will try to bring a similar experience to the business world.

Each organization will have a database and a storage space, to store data and documents, as well a container orchestrator to run the apps. Each app is python based and is created using the `viavai` sdk module. Each organization will have a unique URL, that will be `longlink.com/<country_code>/<organization_name>`. And longlink will behave as a middleware between the user and the apps, providing a unified experience for authentication, billing, user management, backup, security, and so on.

## APPs

Apps are a core part of the platform. Those can be installed with a single click.
Each app provides specific functionalities to the organization, they are divided in 3 categories:

- `Tools`: Long living apps that provide core functionalities to the organization
- `Entities`: Apps that represent real world entities, usually connected to a client or a supplier
- `Projects`: Apps that represent projects, internal or external

## Development

Run the frontend in development mode:

```bash
bun --cwd=web install
bun --cwd=web dev
```

Run the backend in development mode:

```bash
python -m venv .venv
source .venv/bin/activate # On Windows use `.venv\Scripts\activate`
pip install -r api/requirements.txt
pip install -e sdk


```

Finally run the api and a sample app:

```bash
python api/main.py
python sdk/longlink/sample/main.py
```
