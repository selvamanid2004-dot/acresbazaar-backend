export const ADMIN_MODULE_PERMISSIONS = [
  // 1. Dashboard
  {
    id: 'dashboard',
    name: 'Dashboard',
    group: 'Core & Analytics',
    description: 'View executive dashboard summary, metrics, and calendar overview'
  },

  // 2. Customers
  {
    id: 'buyers',
    name: 'Buyers',
    group: 'Customer Management',
    description: 'View and manage registered property buyers'
  },
  {
    id: 'sellers',
    name: 'Sellers',
    group: 'Customer Management',
    description: 'View and manage property sellers and individual owners'
  },
  {
    id: 'dealers',
    name: 'Dealers',
    group: 'Customer Management',
    description: 'View and manage registered real estate dealers and agencies'
  },
  {
    id: 'common_people',
    name: 'Community Partners',
    group: 'Customer Management',
    description: 'View and manage community partners submitting property snaps'
  },

  // 3. Properties
  {
    id: 'properties',
    name: 'Properties',
    group: 'Property Operations',
    description: 'Full management of properties (New, Approved, Hold, Rejected)'
  },
  {
    id: 'gold_properties',
    name: 'Gold Properties',
    group: 'Property Operations',
    description: 'Manage featured Gold Plan property listings'
  },
  {
    id: 'premium_properties',
    name: 'Premium Properties',
    group: 'Property Operations',
    description: 'Manage Platinum & Premium Plan property listings'
  },
  {
    id: 'snap_properties',
    name: 'Snap Properties',
    group: 'Property Operations',
    description: 'Review and approve properties snapped by community partners'
  },
  {
    id: 'bookings',
    name: 'Booked Properties / Deals',
    group: 'Property Operations',
    description: 'Manage property bookings, deals, and reservation statuses'
  },

  // 4. Content & Categories
  {
    id: 'categories',
    name: 'Category Management',
    group: 'Content & CMS',
    description: 'Create, update, and manage property categories and icons'
  },
  {
    id: 'website_settings',
    name: 'Website Content / CMS',
    group: 'Content & CMS',
    description: 'Manage Home, About, and Service CMS content and banners'
  },
  {
    id: 'contact_details',
    name: 'Contact Details',
    group: 'Content & CMS',
    description: 'Update phone, email, address, and social media channels'
  },
  {
    id: 'logo_management',
    name: 'Logo Management',
    group: 'Content & CMS',
    description: 'Upload, modify, and manage portal logo and branding'
  },

  // 5. Operations & Moderation
  {
    id: 'reports',
    name: 'Reports',
    group: 'Operations & Moderation',
    description: 'Review and resolve reported properties and user complaints'
  },
  {
    id: 'rewards',
    name: 'Rewards',
    group: 'Operations & Moderation',
    description: 'Manage partner rewards, bounties, and dealer points payout'
  },
  {
    id: 'verified_partners',
    name: 'Verified Partners / Hub',
    group: 'Operations & Moderation',
    description: 'Approve and manage verified dealer and builder partnerships'
  },
  {
    id: 'plans',
    name: 'Plan Management',
    group: 'Operations & Moderation',
    description: 'Manage Gold and Platinum pricing plans and subscription features'
  },

  // 6. System & Security
  {
    id: 'data_export',
    name: 'Data Download / Export',
    group: 'System & Security',
    description: 'Download CSV and PDF reports for customers, properties, and bookings'
  },
  {
    id: 'staff_management',
    name: 'Administrator & Staff Management',
    group: 'System & Security',
    description: 'Create and manage Administrators, Staff, and Role Permissions'
  },
  {
    id: 'change_password',
    name: 'Password Management',
    group: 'System & Security',
    description: 'Manage personal and account security credentials'
  }
] as const;

export type PermissionCode = typeof ADMIN_MODULE_PERMISSIONS[number]['id'];

export const ALL_PERMISSION_CODES: PermissionCode[] = ADMIN_MODULE_PERMISSIONS.map(p => p.id);
