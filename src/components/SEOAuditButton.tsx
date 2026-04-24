import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SEOAuditPanel } from './SEOAuditPanel';
import { Search } from 'lucide-react-native';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { useAdminRole } from '@/hooks/useAdminRole';

/**
 * SEO Audit Button - Floating button that opens the SEO audit panel
 * Only visible to admin users
 */
export function SEOAuditButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin, loading } = useAdminRole();

  // Only show for admin users
  if (loading || !isAdmin) {
    return null;
  }

  return (
    <>
      {!isOpen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-40"
              size="icon"
            >
              <Search className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>SEO Audit</p>
          </TooltipContent>
        </Tooltip>
      )}
      <SEOAuditPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
