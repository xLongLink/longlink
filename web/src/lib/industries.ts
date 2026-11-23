export const industries: readonly { name: string; useCases: readonly string[] }[] = [
    { name: 'Real Estate Development', useCases: ['Land acquisition pipeline', 'Planning and entitlement approvals'] },
    { name: 'Property Management', useCases: ['Lease and renewal administration', 'Maintenance dispatch'] },
    { name: 'Architecture', useCases: ['Design review approvals', 'Permit submission checklists'] },
    { name: 'Engineering & Design', useCases: ['Engineering change requests', 'Technical calculation review'] },
    {
        name: 'Interior Design & Fit-Out',
        useCases: ['Client concept approvals', 'Furniture, fixtures, and equipment purchasing workflows']
    },
    { name: 'Construction & Contracting', useCases: ['Change orders and variations', 'Payment application review'] },
    {
        name: 'Civil Infrastructure',
        useCases: ['Right-of-way and permit tracking', 'Contractor payment certification']
    },
    {
        name: 'Facilities Management',
        useCases: ['Work orders and service requests', 'Preventive maintenance schedules']
    },
    { name: 'Building Materials', useCases: ['Warranty claim processing', 'Customer order status portals'] },
    { name: 'Urban Planning', useCases: ['Development application intake', 'Zoning review workflows'] },
    {
        name: 'Banking & Credit',
        useCases: ['Commercial credit application intake', 'Credit review and approval packs']
    },
    {
        name: 'Investment & Asset Management',
        useCases: ['Investment due-diligence checklists', 'Investment committee approvals']
    },
    { name: 'Accounting & Tax Services', useCases: ['Tax filing workflow tracking', 'Period-close checklists'] },
    { name: 'Insurance', useCases: ['Claims intake and triage', 'Underwriting submission workflows'] },
    { name: 'Legal Services', useCases: ['Client and matter intake', 'Contract review assignment'] },
    { name: 'Management Consulting', useCases: ['Proposal approval and pricing', 'Engagement staffing'] },
    { name: 'Recruitment & Staffing', useCases: ['Candidate screening workflows', 'Temporary worker assignment'] },
    { name: 'Marketing & Advertising Agencies', useCases: ['Creative brief intake', 'Campaign approval chains'] },
    { name: 'Business Process Outsourcing', useCases: ['Client process onboarding', 'Case allocation and queues'] },
    {
        name: 'Hospitals & Health Systems',
        useCases: ['Patient administrative intake', 'Nonclinical referral coordination']
    },
    { name: 'Outpatient Clinics & Dental', useCases: ['Appointment administration', 'Treatment estimate approvals'] },
    { name: 'Pharmaceuticals', useCases: ['Deviation and CAPA tracking', 'Supplier qualification'] },
    { name: 'Biotechnology', useCases: ['Experiment request workflows', 'Material transfer requests'] },
    { name: 'Medical Devices', useCases: ['Complaint intake and review', 'Corrective action management'] },
    {
        name: 'Diagnostic Laboratories',
        useCases: ['Specimen logistics tracking', 'External laboratory referral tracking']
    },
    {
        name: 'Elder Care & Assisted Living',
        useCases: ['Resident admission administration', 'Incident follow-up administration']
    },
    {
        name: 'Veterinary Services',
        useCases: ['Appointment and referral coordination', 'Treatment consent administration']
    },
    { name: 'Discrete Manufacturing', useCases: ['Production work-order tracking', 'Quality inspection workflows'] },
    {
        name: 'Process Manufacturing & Chemicals',
        useCases: ['Batch record coordination', 'Process deviation tracking']
    },
    { name: 'Electronics & Semiconductors', useCases: ['Test failure disposition', 'New product introduction gates'] },
    { name: 'Food & Beverage Production', useCases: ['HACCP corrective actions', 'Product recall coordination'] },
    { name: 'Automotive', useCases: ['Warranty claim intake', 'Supplier part approval workflows'] },
    { name: 'Aerospace & Defense', useCases: ['Configuration change control', 'Nonconformance review boards'] },
    { name: 'Agriculture & Agribusiness', useCases: ['Farm work-order planning', 'Harvest logistics coordination'] },
    { name: 'Mining & Metals', useCases: ['Contractor permit-to-work administration', 'Mine equipment maintenance'] },
    { name: 'Logistics & Freight', useCases: ['Shipment exception management', 'Cargo claims coordination'] },
    { name: 'Warehousing & Fulfillment', useCases: ['Receiving discrepancy workflows', 'Returns disposition queues'] },
    { name: 'Wholesale & Distribution', useCases: ['Customer credit approval workflows', 'Order dispute resolution'] },
    { name: 'Retail & E-commerce', useCases: ['Returns authorization workflows', 'Vendor onboarding'] },
    { name: 'Hotels & Resorts', useCases: ['Guest service request management', 'Housekeeping task allocation'] },
    { name: 'Restaurants & Foodservice', useCases: ['Kitchen purchasing approvals', 'Staff rota approvals'] },
    { name: 'Travel & Tourism', useCases: ['Itinerary request coordination', 'Refund and complaint handling'] },
    { name: 'Events & Conferences', useCases: ['Venue and vendor coordination', 'Event budget controls'] },
    { name: 'Media & Publishing', useCases: ['Editorial pitch intake', 'Rights and licensing registers'] },
    { name: 'Sports & Fitness', useCases: ['Membership administration', 'Facility booking workflows'] },
    { name: 'Telecommunications', useCases: ['Field technician dispatch', 'Service activation exceptions'] },
    { name: 'Software & IT Services', useCases: ['Customer implementation tracking', 'Change approval workflows'] },
    { name: 'Personal Services & Franchises', useCases: ['Service booking administration', 'Employee onboarding'] },
    {
        name: 'Electric Utilities & Grids',
        useCases: ['Outage response task coordination', 'Connection request workflows']
    },
    { name: 'Renewable Energy', useCases: ['Interconnection application tracking', 'Turbine and panel maintenance'] },
    { name: 'Oil & Gas', useCases: ['Permit-to-work coordination', 'Turnaround shutdown management'] },
    { name: 'Water & Wastewater', useCases: ['Service connection approvals', 'Pump maintenance records'] },
    {
        name: 'Energy Services & Efficiency',
        useCases: ['Retrofit opportunity pipeline', 'Contractor installation coordination']
    },
    { name: 'Waste & Recycling', useCases: ['Collection route exceptions', 'Commercial customer onboarding'] },
    {
        name: 'Environmental Services',
        useCases: ['Environmental audit checklists', 'Site remediation action tracking']
    },
    { name: 'K-12 Education', useCases: ['Student enrollment administration', 'Field trip permission workflows'] },
    { name: 'Higher Education', useCases: ['Research grant administration', 'Academic program approvals'] },
    {
        name: 'Vocational Training',
        useCases: ['Course enrollment and eligibility', 'Apprenticeship placement tracking']
    },
    {
        name: 'Government & Public Administration',
        useCases: ['Citizen service case intake', 'Permit and license applications']
    },
    { name: 'Nonprofits & NGOs', useCases: ['Beneficiary case administration', 'Grant application review'] },
    {
        name: 'Public Safety & Emergency Services',
        useCases: ['Equipment readiness inspections', 'After-action improvement tracking']
    },
    { name: 'Public Transit', useCases: ['Vehicle maintenance work orders', 'Service disruption response tasks'] },
    { name: 'Aviation & Airports', useCases: ['Ground handling coordination', 'Aircraft turnaround exception logs'] },
    { name: 'Maritime & Ports', useCases: ['Vessel call administration', 'Berth allocation requests'] },
    {
        name: 'Rail & Infrastructure Operators',
        useCases: ['Rolling stock maintenance logs', 'Engineering change approvals']
    }
];

export const sharedUseCases: readonly string[] = [
    'Accounts payable exception review',
    'Expense and reimbursement approvals',
    'Purchase request approvals',
    'Supplier onboarding and qualification',
    'Employee onboarding tasks',
    'Leave and absence approvals',
    'Contract request intake',
    'Renewal and termination alerts',
    'Quote and discount approvals',
    'Customer onboarding',
    'Complaint investigation and follow-up',
    'Service-level escalation',
    'Project request intake',
    'Portfolio prioritization approvals',
    'Preventive maintenance scheduling',
    'Repair request dispatch',
    'Nonconformance and corrective actions',
    'Root-cause investigation workflows',
    'Stock replenishment requests',
    'Warehouse transfer approvals',
    'Cross-system data reconciliation',
    'Master data change approvals',
    'Controlled document version review',
    'Document expiry reminders',
    'IT service and access requests',
    'Permission approval workflows',
    'Supplier sustainability questionnaires',
    'Environmental compliance task tracking',
    'Audit finding remediation',
    'Third-party risk review',
    'Workspace and desk allocation',
    'Building repair requests'
];
