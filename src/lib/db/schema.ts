import { sql } from "@vercel/postgres";

export async function createTables() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create credits table
    await sql`
      CREATE TABLE IF NOT EXISTS credits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        balance INTEGER DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create games table
    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        fen TEXT,
        pgn TEXT,
        status VARCHAR(50) DEFAULT 'in_progress',
        difficulty VARCHAR(50) DEFAULT 'beginner',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    return result.rows[0];
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
}

export async function createUser(email: string, name: string) {
  try {
    const result = await sql`
      INSERT INTO users (email, name)
      VALUES (${email}, ${name})
      RETURNING *
    `;

    // Create initial credits for the user
    await sql`
      INSERT INTO credits (user_id, balance)
      VALUES (${result.rows[0].id}, 10)
    `;

    return result.rows[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function getUserCredits(userId: number) {
  try {
    const result = await sql`
      SELECT balance FROM credits WHERE user_id = ${userId}
    `;
    return result.rows[0]?.balance || 0;
  } catch (error) {
    console.error("Error getting user credits:", error);
    throw error;
  }
}

export async function updateUserCredits(
  userId: number,
  amount: number,
  type: string,
  description: string
) {
  try {
    // Start a transaction
    await sql`BEGIN`;

    // Update credits balance
    await sql`
      UPDATE credits
      SET balance = balance + ${amount}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `;

    // Record the transaction
    await sql`
      INSERT INTO transactions (user_id, amount, type, description)
      VALUES (${userId}, ${amount}, ${type}, ${description})
    `;

    // Commit the transaction
    await sql`COMMIT`;

    // Get the updated balance
    const result = await sql`
      SELECT balance FROM credits WHERE user_id = ${userId}
    `;

    return result.rows[0]?.balance || 0;
  } catch (error) {
    // Rollback in case of error
    await sql`ROLLBACK`;
    console.error("Error updating user credits:", error);
    throw error;
  }
}

export async function saveGame(
  userId: number,
  fen: string,
  pgn: string,
  status: string
) {
  try {
    const result = await sql`
      INSERT INTO games (user_id, fen, pgn, status, updated_at)
      VALUES (${userId}, ${fen}, ${pgn}, ${status}, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error("Error saving game:", error);
    throw error;
  }
}

export async function updateGame(
  gameId: number,
  fen: string,
  pgn: string,
  status: string
) {
  try {
    const result = await sql`
      UPDATE games
      SET fen = ${fen}, pgn = ${pgn}, status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${gameId}
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error("Error updating game:", error);
    throw error;
  }
}

export async function getUserGames(userId: number) {
  try {
    const result = await sql`
      SELECT * FROM games
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("Error getting user games:", error);
    throw error;
  }
}
