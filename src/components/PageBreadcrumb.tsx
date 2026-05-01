// PageBreadcrumb is a no-op on mobile.
// Rationale: Lovable/web uses breadcrumbs because URLs are visible; RN already
// communicates hierarchy via the stack header + BackButton. Rendering extra
// breadcrumb chrome on phones would waste vertical space and double up with
// the existing header row.
// Kept as a named export so imports from ported Lovable code don't break.
import React from 'react';
export function PageBreadcrumb(_props: any) {
  return null;
}
export default PageBreadcrumb;
