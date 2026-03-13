/**
 * Toast Store
 * 
 * Global toast notification system using Zustand.
 * Allows toasts to persist across navigation and screen changes.
 */

import { create } from 'zustand';

interface ToastState {
  // Gacha ticket toast
  showTicketToast: boolean;
  ticketCount: number;
  
  // Actions
  showGachaTicketToast: (tickets: number) => void;
  hideGachaTicketToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  showTicketToast: false,
  ticketCount: 0,
  
  showGachaTicketToast: (tickets: number) => {
    set({ showTicketToast: true, ticketCount: tickets });
  },
  
  hideGachaTicketToast: () => {
    set({ showTicketToast: false, ticketCount: 0 });
  },
}));
