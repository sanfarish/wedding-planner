export interface NavItem {
  title: string
  icon: string
  to: { name: string }
}

export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', icon: 'mdi-home-heart', to: { name: 'dashboard' } },
  { title: 'Tasks', icon: 'mdi-checkbox-marked-circle-outline', to: { name: 'tasks' } },
  { title: 'Budget', icon: 'mdi-wallet-outline', to: { name: 'budget' } },
  { title: 'Guests', icon: 'mdi-account-group-outline', to: { name: 'guests' } },
  { title: 'Vendors', icon: 'mdi-storefront-outline', to: { name: 'vendors' } },
  { title: 'Timeline', icon: 'mdi-timeline-clock-outline', to: { name: 'timeline' } },
  { title: 'Notes', icon: 'mdi-note-text-outline', to: { name: 'notes' } },
  { title: 'Documents', icon: 'mdi-file-link-outline', to: { name: 'documents' } },
  { title: 'Activity', icon: 'mdi-history', to: { name: 'activity' } },
]

export const SETTINGS_ITEM: NavItem = { title: 'Settings', icon: 'mdi-cog-outline', to: { name: 'settings' } }

/** Shown in the mobile bottom bar; everything else lives under "More". */
export const MOBILE_PRIMARY = ['dashboard', 'tasks', 'budget', 'guests']
