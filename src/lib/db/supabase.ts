import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Create a supabase admin client with service role key for admin operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Define database types
export type User = {
  id: string;
  email: string;
  name?: string;
  created_at: string;
};

export type Credits = {
  id: number;
  user_id: string;
  balance: number;
  updated_at: string;
};

export type Transaction = {
  id: number;
  user_id: string;
  amount: number;
  type: string;
  description?: string;
  created_at: string;
};

export type Game = {
  id: number;
  user_id: string;
  fen: string;
  pgn: string;
  status: "in_progress" | "completed" | "abandoned";
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  created_at: string;
  updated_at: string;
};

// Database operations
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    console.error("Error getting user by email:", error);
    return null;
  }

  return data;
}

export async function createUser(
  email: string,
  name: string
): Promise<User | null> {
  // Insert user
  const { data: userData, error: userError } = await supabase
    .from("users")
    .insert([{ email, name }])
    .select()
    .single();

  if (userError) {
    console.error("Error creating user:", userError);
    return null;
  }

  // Initialize credits for the new user
  const { error: creditsError } = await supabase
    .from("credits")
    .insert([{ user_id: userData.id, balance: 10 }]);

  if (creditsError) {
    console.error("Error initializing credits:", creditsError);
    // We'll still return the user even if credits initialization fails
  }

  return userData;
}

export async function getUserCredits(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error getting user credits:", error);
    return 0;
  }

  return data?.balance || 0;
}

export async function updateUserCredits(
  userId: string,
  amount: number,
  type: string,
  description: string
): Promise<number> {
  // Start a transaction using RPC (Remote Procedure Call)
  const { data, error } = await supabase.rpc("update_user_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description,
  });

  if (error) {
    console.error("Error updating user credits:", error);
    throw error;
  }

  return data || 0;
}

export async function saveGame(
  userId: string,
  fen: string,
  pgn: string,
  status: "in_progress" | "completed" | "abandoned",
  difficulty: "beginner" | "intermediate" | "advanced" | "expert"
): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .insert([
      {
        user_id: userId,
        fen,
        pgn,
        status,
        difficulty,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error saving game:", error);
    return null;
  }

  return data;
}

export async function updateGame(
  gameId: number,
  fen: string,
  pgn: string,
  status: "in_progress" | "completed" | "abandoned"
): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .update({
      fen,
      pgn,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    console.error("Error updating game:", error);
    return null;
  }

  return data;
}

export async function getUserGames(userId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error getting user games:", error);
    return [];
  }

  return data || [];
}
