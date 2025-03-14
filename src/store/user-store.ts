// This file is being removed as part of V1 cleanup
// We'll reimplement user authentication in a future version

import { create } from "zustand";

// Dummy credit packages for V1
const CREDIT_PACKAGES = [
  { id: "basic", name: "Basic", credits: 10, price: 5 },
  { id: "standard", name: "Standard", credits: 25, price: 10 },
  { id: "premium", name: "Premium", credits: 60, price: 20 },
];

interface UserState {
  // User state
  user: {
    id: string;
    email: string;
    name?: string;
  } | null;
  credits: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  getCredits: () => Promise<number>;
  useCredits: (amount: number, description: string) => Promise<boolean>;
  purchaseCredits: (packageId: string) => Promise<{ url: string } | null>;
}

// Dummy implementation for V1
export const useUserStore = create<UserState>((set, get) => ({
  // User state
  user: null,
  credits: 0,
  isLoading: false,
  error: null,

  // Actions - dummy implementations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login: async (email: string, _password: string) => {
    set({ isLoading: true, error: null });
    // Dummy implementation
    setTimeout(() => {
      set({
        user: {
          id: "dummy-user-id",
          email: email,
          name: "Guest User",
        },
        credits: 10,
        isLoading: false,
      });
    }, 500);
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signup: async (email: string, _password: string, name: string) => {
    set({ isLoading: true, error: null });
    // Dummy implementation
    setTimeout(() => {
      set({
        user: {
          id: "dummy-user-id",
          email: email,
          name: name,
        },
        credits: 10,
        isLoading: false,
      });
    }, 500);
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    // Dummy implementation
    setTimeout(() => {
      set({
        user: null,
        credits: 0,
        isLoading: false,
      });
    }, 500);
  },

  checkSession: async () => {
    set({ isLoading: true, error: null });
    // Dummy implementation
    setTimeout(() => {
      set({
        user: null,
        credits: 0,
        isLoading: false,
      });
    }, 500);
  },

  getCredits: async () => {
    const { user } = get();
    if (!user) return 0;
    // Dummy implementation
    return get().credits;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useCredits: async (amount: number, _description: string) => {
    const { user, credits } = get();
    if (!user) {
      set({ error: "You must be logged in to use credits" });
      return false;
    }
    if (credits < amount) {
      set({ error: "Not enough credits" });
      return false;
    }
    // Dummy implementation
    set({ credits: credits - amount });
    return true;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  purchaseCredits: async (_packageId: string) => {
    const { user } = get();
    if (!user) {
      set({ error: "You must be logged in to purchase credits" });
      return null;
    }

    // Log available packages for reference
    console.log("Available packages:", CREDIT_PACKAGES);

    // Dummy implementation
    return { url: "#dummy-checkout-url" };
  },
}));
