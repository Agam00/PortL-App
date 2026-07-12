import { create } from "zustand";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface UiState {
  toast: Toast | null;
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  showToast: (message, type = "info") => set({ toast: { id: Date.now(), message, type } }),
  dismissToast: () => set({ toast: null }),
}));
