/**
 * context/GroupSheetContext.tsx
 * ─────────────────────────────
 * Global context that lets any component trigger the GroupDetailSheet
 * which is rendered at the (tabs)/_layout level — i.e. ABOVE the tab bar.
 */
import { createContext, useCallback, useContext, useState } from 'react';
import type { MapGroup } from '@/hooks/useMapGroups';

interface GroupSheetCallbacks {
  onJoined?: (groupId: string) => void;
  onOpenChat?: (groupId: string) => void;
}

interface GroupSheetEntry {
  group: MapGroup;
  onJoined?: (groupId: string) => void;
  onOpenChat?: (groupId: string) => void;
}

interface GroupSheetContextValue {
  entry: GroupSheetEntry | null;
  openGroup: (group: MapGroup, cbs?: GroupSheetCallbacks) => void;
  closeGroup: () => void;
}

const GroupSheetContext = createContext<GroupSheetContextValue | null>(null);

export function GroupSheetProvider({ children }: { children: React.ReactNode }) {
  const [entry, setEntry] = useState<GroupSheetEntry | null>(null);

  const openGroup = useCallback(
    (group: MapGroup, cbs: GroupSheetCallbacks = {}) => {
      setEntry({ group, ...cbs });
    },
    [],
  );

  const closeGroup = useCallback(() => setEntry(null), []);

  return (
    <GroupSheetContext.Provider value={{ entry, openGroup, closeGroup }}>
      {children}
    </GroupSheetContext.Provider>
  );
}

export function useGroupSheet() {
  const ctx = useContext(GroupSheetContext);
  if (!ctx) throw new Error('useGroupSheet must be inside GroupSheetProvider');
  return ctx;
}
