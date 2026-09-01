import React, { createContext, useCallback, useContext, ReactNode } from 'react';
import AccountBottomSheet from '@/components/AccountBottomSheet';
import { useSheetRef } from '@/utils/useSheetRef';

type AccountSheetContextType = {
  openAccountSheet: () => void;
};

const AccountSheetContext = createContext<AccountSheetContextType | undefined>(undefined);

export const useAccountSheet = () => {
  const ctx = useContext(AccountSheetContext);
  if (!ctx) throw new Error('useAccountSheet must be used within AccountSheetProvider');
  return ctx;
};

// Single shared instance so Home/Search/Library don't each mount their own
// copy of the sheet and its open-state plumbing.
export const AccountSheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const accountSheetRef = useSheetRef();

  const openAccountSheet = useCallback(() => {
    accountSheetRef.current?.present();
  }, [accountSheetRef]);

  return (
    <AccountSheetContext.Provider value={{ openAccountSheet }}>
      {children}
      <AccountBottomSheet ref={accountSheetRef} />
    </AccountSheetContext.Provider>
  );
};
