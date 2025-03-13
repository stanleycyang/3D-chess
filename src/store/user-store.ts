import { create } from "zustand";
import { supabase } from "@/lib/db/supabase";
import { getUserCredits, updateUserCredits } from "@/lib/db/supabase";
import { CREDIT_PACKAGES } from "@/lib/stripe/stripe-client";

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

export const useUserStore = create<UserState>((set, get) => ({
  // User state
  user: null,
  credits: 0,
  isLoading: false,
  error: null,

  // Actions
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata.name,
          },
          isLoading: false,
        });

        // Get user credits
        await get().getCredits();
      }
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  signup: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata.name,
          },
          isLoading: false,
        });

        // Get user credits (should be initialized with 10 free credits)
        await get().getCredits();
      }
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      set({
        user: null,
        credits: 0,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  checkSession: async () => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (data.session?.user) {
        const user = data.session.user;

        set({
          user: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata.name,
          },
          isLoading: false,
        });

        // Get user credits
        await get().getCredits();
      } else {
        set({
          user: null,
          credits: 0,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  getCredits: async () => {
    const { user } = get();

    if (!user) {
      return 0;
    }

    try {
      const credits = await getUserCredits(user.id);
      set({ credits });
      return credits;
    } catch (error) {
      console.error("Error getting credits:", error);
      return 0;
    }
  },

  useCredits: async (amount: number, description: string) => {
    const { user, credits } = get();

    if (!user) {
      set({ error: "You must be logged in to use credits" });
      return false;
    }

    if (credits < amount) {
      set({ error: "Not enough credits" });
      return false;
    }

    try {
      const newBalance = await updateUserCredits(
        user.id,
        -amount,
        "use",
        description
      );
      set({ credits: newBalance });
      return true;
    } catch (error) {
      set({ error: (error as Error).message });
      return false;
    }
  },

  purchaseCredits: async (packageId: string) => {
    const { user } = get();

    if (!user) {
      set({ error: "You must be logged in to purchase credits" });
      return null;
    }

    const creditPackage = CREDIT_PACKAGES.find((pkg) => pkg.id === packageId);

    if (!creditPackage) {
      set({ error: "Invalid credit package" });
      return null;
    }

    set({ isLoading: true, error: null });

    try {
      // Call API to create Stripe checkout session
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();
      set({ isLoading: false });

      return { url: data.url };
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
      return null;
    }
  },
}));
