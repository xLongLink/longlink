## 📌 **Deep Research Prompt (for an ISIC Class 4 Code)**

**Objective:**
Investigate existing SaaS platforms that serve businesses within ISIC class **{INSERT_ISIC_CODE_AND_DESCRIPTION}**. Analyze their functional offering, business model, pricing, value proposition, compliance/governance support, and operational processes. Then assess how an equivalent solution could be built as a **LongLink App** at reduced cost, with detailed justification for processes, validation, compliance, and pricing differences.

### 🧠 **Research Scope & Questions**

1. **Industry Context & Needs**
    - What operational/business challenges do companies in this ISIC class face?
    - What regulatory / statutory compliance requirements apply (e.g., food safety, environmental, traceability, worker safety)?
    - What standard operational workflows exist in this industry?

2. **Existing SaaS Solutions**
    - Identify 3–6 SaaS platforms that provide services tailored to the target industry (e.g., vineyard/farm management, traceability, compliance, planning).
    - For each SaaS:
        - Core functional modules (e.g., crop scheduling, inventory, compliance reporting).
        - Technology model (cloud, mobile, integrations).
        - Compliance support (does it help with local laws, audit-ready reporting, record keeping?).
        - Data governance and policies (data ownership, security certifications).
        - Pricing model (subscription tiers, user counts, feature limits).
        - Target customer segment (small farm, enterprise cooperative, export aggregator).

3. **SaaS Business Model**
    - How do these SaaS providers price and package services (e.g., monthly/annual licenses)?
        - Include approximate pricing ranges (if publicly available).
        - What’s included/excluded in each tier?

    - What are the typical customer acquisition costs & retention strategies?
    - Are there usage-based fees (API calls, data storage, user seats)?

4. **Operational Processes & Workflows**
    - For each SaaS, map the typical workflow:
        - How does the system **acquire and validate data**?
        - How does it **manage tasks** (planning, execution, tracking)?
        - How does it enforce **compliance and audit trails**?
        - What governance is embedded (roles, approvals, exception handling)?

    - What bottlenecks or gaps exist in these SaaS workflows?

5. **Governance, Validation & Compliance**
    - Does the SaaS help businesses:
        - Comply with specific agriculture regulations?
        - Generate audit-ready documentation?
        - Connect to government systems or certification bodies?

    - What validation checks are built in (e.g., input constraints, traceability)?

6. **Comparison to LongLink Implementation**
    - Define core app modules needed on LongLink to replicate SaaS capabilities.
    - For each feature/module:
        - How would it be implemented on LongLink (data model, UI flows, validation, governance)?
        - Can LongLink enforce permission and validation consistently via the control plane?
        - Where would LongLink save cost relative to existing SaaS (compute, scaling, governance reuse)?

    - What additional governance or compliance automation can LongLink provide that current SaaS does not?

7. **Cost Analysis**
    - Estimate LongLink app costs:
        - Development effort (person-months)
        - Infrastructure (LongLink runtime, storage, database)
        - Maintenance

    - Compare this to typical SaaS subscriptions over 3–5 years.
    - Include total cost of ownership (TCO), break-even analysis, and ROI.

8. **Compliance & Legal Requirements**
    - Identify specific laws and standards relevant to the industry (e.g., food safety, worker protection, chemical use records).
    - How do SaaS solutions currently implement compliance modules?
    - Propose how the LongLink app will support each compliance requirement (workflows, reporting, audit trails, external integrations).

### 🧩 **Detailed Output Structure (Deliverables)**

Your research deliverable should include:

1. **Executive Summary**
    - Key findings, major SaaS vendors, pricing overview, and comparative conclusion.

2. **Industry Needs Synopsis**
    - Detailed breakdown of operational and compliance needs in the sector.

3. **SaaS Vendor Profiles**
    - Table with features, pricing, governance support, compliance coverage.

4. **Workflow & Compliance Maps**
    - Diagrams or step sequences for each critical operational process.

5. **LongLink App Blueprint**
    - Modular architecture
    - Data schema proposals
    - UI interaction flows
    - Permission models

6. **Cost & Value Comparison**
    - Side-by-side TCO chart
    - Gap analysis: what LongLink could add that SaaS lacks

7. **Risk & Limitations**
    - Technical and regulatory limitations
    - Assumptions made

8. **Recommendations**
    - Whether building on LongLink is cost-effective
    - Suggested feature prioritization

---

### 📊 **Core Business Model Variables to Collect**

- License type + payment cadence
- Per-user pricing
- Per-module pricing
- Storage/usage limits
- Support costs
- Onboarding fees
- Data export rights

---

### 🧾 **Governance & Compliance to Document**

- Data retention rules
- Audit logging requirements
- Role hierarchy & permission enforcement
- Regulatory reporting obligations
- Worker safety checklists
- Chemical/plant protection product tracking
- Hazard reporting flows
