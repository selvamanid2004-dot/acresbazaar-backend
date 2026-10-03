export interface ModuleAction {
  id: string; // e.g. "properties.view", "properties.create", "properties.update", "properties.delete", "properties.approve", "properties.reject"
  action: string; // "view", "create", "update", "delete", "approve", "reject", "process", "mark_paid", "activate", "export", etc.
  name: string; // "View", "Add / Create", "Edit / Update", "Delete", "Approve", "Reject", etc.
  description?: string;
}

export interface AdminModulePermission {
  id: string;
  name: string;
  group: string;
  description: string;
  actions: ModuleAction[];
}

export const ADMIN_MODULE_PERMISSIONS: AdminModulePermission[] = [
  // 1. Dashboard
  {
    id: 'dashboard',
    name: 'Dashboard',
    group: 'Core & Analytics',
    description: 'View executive dashboard summary, metrics, and calendar overview',
    actions: [
      { id: 'dashboard.view', action: 'view', name: 'View Dashboard & Metrics', description: 'View executive dashboard metrics and overview' }
    ]
  },

  // 2. Customers / CRM
  {
    id: 'buyers',
    name: 'Buyers',
    group: 'Customer Management',
    description: 'View and manage registered property buyers',
    actions: [
      { id: 'buyers.view', action: 'view', name: 'View', description: 'View buyers list & full customer profiles' },
      { id: 'buyers.create', action: 'create', name: 'Add / Create', description: 'Register or add new buyer profiles' },
      { id: 'buyers.update', action: 'update', name: 'Edit / Update', description: 'Edit buyer contact & membership details' },
      { id: 'buyers.delete', action: 'delete', name: 'Delete', description: 'Permanently remove buyer accounts' },
      { id: 'buyers.activate', action: 'activate', name: 'Activate / Deactivate', description: 'Toggle active/inactive status' }
    ]
  },
  {
    id: 'sellers',
    name: 'Sellers',
    group: 'Customer Management',
    description: 'View and manage property sellers and individual owners',
    actions: [
      { id: 'sellers.view', action: 'view', name: 'View', description: 'View sellers and property owners' },
      { id: 'sellers.create', action: 'create', name: 'Add / Create', description: 'Register new seller accounts' },
      { id: 'sellers.update', action: 'update', name: 'Edit / Update', description: 'Update seller details' },
      { id: 'sellers.delete', action: 'delete', name: 'Delete', description: 'Delete seller records' },
      { id: 'sellers.activate', action: 'activate', name: 'Activate / Deactivate', description: 'Toggle active/inactive seller status' }
    ]
  },
  {
    id: 'dealers',
    name: 'Dealers',
    group: 'Customer Management',
    description: 'View and manage registered real estate dealers and agencies',
    actions: [
      { id: 'dealers.view', action: 'view', name: 'View', description: 'View dealers and brokerage firms' },
      { id: 'dealers.create', action: 'create', name: 'Add / Create', description: 'Add dealer profile' },
      { id: 'dealers.update', action: 'update', name: 'Edit / Update', description: 'Modify dealer business credentials' },
      { id: 'dealers.delete', action: 'delete', name: 'Delete', description: 'Remove dealer account' },
      { id: 'dealers.activate', action: 'activate', name: 'Activate / Deactivate', description: 'Toggle dealer status' }
    ]
  },
  {
    id: 'common_people',
    name: 'Community Partners',
    group: 'Customer Management',
    description: 'View and manage community partners submitting property snaps',
    actions: [
      { id: 'common_people.view', action: 'view', name: 'View', description: 'View community scouts and partners' },
      { id: 'common_people.update', action: 'update', name: 'Edit / Update', description: 'Update partner profile and wallet' },
      { id: 'common_people.delete', action: 'delete', name: 'Delete', description: 'Delete community partner account' },
      { id: 'common_people.activate', action: 'activate', name: 'Activate / Deactivate', description: 'Toggle active/suspended status' }
    ]
  },

  // 3. Properties
  {
    id: 'properties',
    name: 'Properties',
    group: 'Property Operations',
    description: 'Full management of properties (New, Approved, Hold, Rejected)',
    actions: [
      { id: 'properties.view', action: 'view', name: 'View', description: 'View property inventory and details' },
      { id: 'properties.create', action: 'create', name: 'Add / Create', description: 'Add new property listings' },
      { id: 'properties.update', action: 'update', name: 'Edit / Update', description: 'Modify property details and images' },
      { id: 'properties.delete', action: 'delete', name: 'Delete', description: 'Delete property records' },
      { id: 'properties.approve', action: 'approve', name: 'Approve', description: 'Approve submissions and publish live' },
      { id: 'properties.reject', action: 'reject', name: 'Reject / Hold', description: 'Reject listings or place on hold' }
    ]
  },
  {
    id: 'gold_properties',
    name: 'Gold Properties',
    group: 'Property Operations',
    description: 'Manage featured Gold Plan property listings',
    actions: [
      { id: 'gold_properties.view', action: 'view', name: 'View', description: 'View Gold tier listings' },
      { id: 'gold_properties.approve', action: 'approve', name: 'Approve as Gold', description: 'Approve listings under Gold tier' },
      { id: 'gold_properties.reject', action: 'reject', name: 'Reject / Hold', description: 'Reject Gold listings' },
      { id: 'gold_properties.update', action: 'update', name: 'Edit / Update', description: 'Edit Gold property specifications' }
    ]
  },
  {
    id: 'premium_properties',
    name: 'Premium Properties',
    group: 'Property Operations',
    description: 'Manage Platinum & Premium Plan property listings',
    actions: [
      { id: 'premium_properties.view', action: 'view', name: 'View', description: 'View Premium listings' },
      { id: 'premium_properties.approve', action: 'approve', name: 'Approve as Premium', description: 'Approve listings under Premium tier' },
      { id: 'premium_properties.reject', action: 'reject', name: 'Reject / Hold', description: 'Reject Premium listings' },
      { id: 'premium_properties.update', action: 'update', name: 'Edit / Update', description: 'Edit Premium property specifications' }
    ]
  },
  {
    id: 'snap_properties',
    name: 'Snap Properties',
    group: 'Property Operations',
    description: 'Review and approve properties snapped by community partners',
    actions: [
      { id: 'snap_properties.view', action: 'view', name: 'View', description: 'View snapped signboards and GPS spots' },
      { id: 'snap_properties.approve', action: 'approve', name: 'Approve', description: 'Approve snap and award reward points' },
      { id: 'snap_properties.reject', action: 'reject', name: 'Reject', description: 'Reject invalid or duplicate snap' },
      { id: 'snap_properties.delete', action: 'delete', name: 'Delete', description: 'Delete snap record' }
    ]
  },
  {
    id: 'bookings',
    name: 'Booked Properties / Deals',
    group: 'Property Operations',
    description: 'Manage property bookings, deals, and reservation statuses',
    actions: [
      { id: 'bookings.view', action: 'view', name: 'View', description: 'View customer inquiries and bookings' },
      { id: 'bookings.update', action: 'update', name: 'Edit / Update Status', description: 'Update booking status (Contacted, Closed, Cancelled)' },
      { id: 'bookings.delete', action: 'delete', name: 'Delete', description: 'Delete booking inquiries' }
    ]
  },

  // 4. Content & Categories
  {
    id: 'categories',
    name: 'Category Management',
    group: 'Content & CMS',
    description: 'Create, update, and manage property categories and icons',
    actions: [
      { id: 'categories.view', action: 'view', name: 'View', description: 'View categories' },
      { id: 'categories.create', action: 'create', name: 'Add / Create', description: 'Create new category with image and specifications' },
      { id: 'categories.update', action: 'update', name: 'Edit / Update', description: 'Modify category names and display order' },
      { id: 'categories.delete', action: 'delete', name: 'Delete', description: 'Delete unused categories' }
    ]
  },
  {
    id: 'website_settings',
    name: 'Website Content / CMS',
    group: 'Content & CMS',
    description: 'Manage Home, About, and Service CMS content and banners',
    actions: [
      { id: 'website_settings.view', action: 'view', name: 'View', description: 'View current website settings and copy' },
      { id: 'website_settings.update', action: 'update', name: 'Edit / Update', description: 'Update hero slides, banner text, and CMS sections' }
    ]
  },
  {
    id: 'contact_details',
    name: 'Contact Details',
    group: 'Content & CMS',
    description: 'Update phone, email, address, and social media channels',
    actions: [
      { id: 'contact_details.view', action: 'view', name: 'View', description: 'View contact details' },
      { id: 'contact_details.update', action: 'update', name: 'Edit / Update', description: 'Update official email, phone, and addresses' }
    ]
  },
  {
    id: 'logo_management',
    name: 'Logo Management',
    group: 'Content & CMS',
    description: 'Upload, modify, and manage portal logo and branding',
    actions: [
      { id: 'logo_management.view', action: 'view', name: 'View', description: 'View current logos' },
      { id: 'logo_management.update', action: 'update', name: 'Edit / Update', description: 'Upload and update portal logos and favicon' }
    ]
  },

  // 5. Operations & Moderation
  {
    id: 'reports',
    name: 'Reports',
    group: 'Operations & Moderation',
    description: 'Review and resolve reported properties and user complaints',
    actions: [
      { id: 'reports.view', action: 'view', name: 'View', description: 'View reported listings and issues' },
      { id: 'reports.update', action: 'update', name: 'Edit / Resolve', description: 'Mark reports as resolved or in progress' },
      { id: 'reports.delete', action: 'delete', name: 'Delete', description: 'Delete resolved report logs' },
      { id: 'reports.export', action: 'export', name: 'Export / Download', description: 'Export complaints and audit logs' }
    ]
  },
  {
    id: 'rewards',
    name: 'Rewards & Claims',
    group: 'Operations & Moderation',
    description: 'Manage partner rewards, bounties, and dealer points payout',
    actions: [
      { id: 'rewards.view', action: 'view', name: 'View', description: 'View reward claims, partner wallets, and ledger' },
      { id: 'rewards.approve', action: 'approve', name: 'Approve Claim', description: 'Approve partner cash reward claim' },
      { id: 'rewards.reject', action: 'reject', name: 'Reject Claim', description: 'Reject claim and release points back to wallet' },
      { id: 'rewards.process', action: 'process', name: 'Mark as Processing', description: 'Put claim in payment processing' },
      { id: 'rewards.mark_paid', action: 'mark_paid', name: 'Mark as Paid', description: 'Record payment reference / UTR and complete payout' },
      { id: 'rewards.settings', action: 'settings', name: 'Update Reward Settings', description: 'Configure points per property and payout conversion' }
    ]
  },
  {
    id: 'verified_partners',
    name: 'Verified Partners / Hub',
    group: 'Operations & Moderation',
    description: 'Approve and manage verified dealer and builder partnerships',
    actions: [
      { id: 'verified_partners.view', action: 'view', name: 'View', description: 'View partner hub applications' },
      { id: 'verified_partners.approve', action: 'approve', name: 'Approve Partner', description: 'Verify partner status' },
      { id: 'verified_partners.reject', action: 'reject', name: 'Reject Partner', description: 'Reject partner application' },
      { id: 'verified_partners.update', action: 'update', name: 'Edit / Update', description: 'Update partner tier & badges' }
    ]
  },
  {
    id: 'plans',
    name: 'Plan Management',
    group: 'Operations & Moderation',
    description: 'Manage Gold and Platinum pricing plans and subscription features',
    actions: [
      { id: 'plans.view', action: 'view', name: 'View', description: 'View membership plans and pricing' },
      { id: 'plans.update', action: 'update', name: 'Edit / Update', description: 'Update plan fees, limits, and featured perks' }
    ]
  },

  // 6. System & Security
  {
    id: 'data_export',
    name: 'Data Download / Export',
    group: 'System & Security',
    description: 'Download CSV and PDF reports for customers, properties, and bookings',
    actions: [
      { id: 'data_export.view', action: 'view', name: 'View', description: 'View export center' },
      { id: 'data_export.download', action: 'download', name: 'Export / Download', description: 'Generate and download CSV/Excel/PDF exports' }
    ]
  },
  {
    id: 'staff_management',
    name: 'Administrator & Staff Management',
    group: 'System & Security',
    description: 'Create and manage Administrators, Staff, and Role Permissions',
    actions: [
      { id: 'staff_management.view', action: 'view', name: 'View', description: 'View staff directory and permissions' },
      { id: 'staff_management.create', action: 'create', name: 'Add / Create', description: 'Create new Administrator and Staff accounts' },
      { id: 'staff_management.update', action: 'update', name: 'Edit / Update Permissions', description: 'Update staff details and module action privileges' },
      { id: 'staff_management.delete', action: 'delete', name: 'Delete', description: 'Delete or remove staff accounts' },
      { id: 'staff_management.reset_password', action: 'reset_password', name: 'Reset Password', description: 'Reset staff credentials' }
    ]
  },
  {
    id: 'change_password',
    name: 'Password Management',
    group: 'System & Security',
    description: 'Manage personal and account security credentials',
    actions: [
      { id: 'change_password.update', action: 'update', name: 'Update Password', description: 'Change personal login password' }
    ]
  }
];

export type PermissionCode = string;

export const ALL_MODULE_CODES: string[] = ADMIN_MODULE_PERMISSIONS.map(p => p.id);

export const ALL_ACTION_CODES: string[] = ADMIN_MODULE_PERMISSIONS.flatMap(m => m.actions.map(a => a.id));

export const ALL_PERMISSION_CODES: string[] = [...ALL_MODULE_CODES, ...ALL_ACTION_CODES];

export function getModuleActions(moduleId: string): ModuleAction[] {
  const mod = ADMIN_MODULE_PERMISSIONS.find(m => m.id === moduleId);
  return mod ? mod.actions : [];
}

export function getAllActionIdsForModule(moduleId: string): string[] {
  const mod = ADMIN_MODULE_PERMISSIONS.find(m => m.id === moduleId);
  return mod ? mod.actions.map(a => a.id) : [];
}
