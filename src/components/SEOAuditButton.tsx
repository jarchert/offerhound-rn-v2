import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Search } from 'lucide-react-native';
import { useAdminRole } from '@/hooks/useAdminRole';
import { radius } from '@/lib/theme';

// GAP: SEOAuditPanel not yet ported. Stub renders nothing when isOpen=true; replace
// with real panel once ported. The button itself is functionally correct.
function SEOAuditPanel(_: { isOpen: boolean; onClose: () => void }) {
  return null;
}

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
        <View style={styles.fab}>
          <Button
            onPress={() => setIsOpen(true)}
            size="icon"
          >
            <Search size={20} color="#ffffff" />
          </Button>
        </View>
      )}
      <SEOAuditPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: radius.full,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 40,
  },
});
