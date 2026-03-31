import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccountsState {
  accounts: any[];
  selectedAccountId: string | null;
  newAccount: any;
  loading: boolean;
  error: string | null;
  setAccounts: (accounts: any[]) => void;
  setSelectedAccountId: (id: string | null) => void;
  setNewAccount: (account: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadAccounts: () => Promise<void>;
}

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],
      selectedAccountId: null,
      newAccount: {},
      loading: false,
      error: null,
      setAccounts: (accounts) => set({ accounts }),
      setSelectedAccountId: (id) => set({ selectedAccountId: id }),
      setNewAccount: (account) => set({ newAccount: account }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      loadAccounts: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/accounts');
          if (!response.ok) throw new Error('Failed to load accounts');
          const data = await response.json();
          set({ accounts: data.items || data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
    }),
    {
      name: 'accounts-storage',
    }
  )
);
