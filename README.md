# 3D Chess with LLMs

An interactive 3D chess application with AI assistance powered by large language models.

## Features

- **3D Chess Board**: Beautiful and interactive 3D chess board using Three.js and React Three Fiber
- **AI Opponent**: Play against an AI opponent powered by large language models
- **Adjustable Difficulty**: Choose from beginner, intermediate, or advanced difficulty levels
- **Position Analysis**: Get detailed analysis of your chess positions
- **Learning Tools**: Improve your chess skills with AI-powered learning tools
- **Credit System**: Purchase credits to unlock advanced features

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **3D Rendering**: Three.js, React Three Fiber, Drei
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **AI**: OpenAI API (GPT-4o)
- **Chess Logic**: chess.js

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account
- OpenAI API key
- Stripe account (for payments)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/3d-chess.git
   cd 3d-chess
   ```

2. Install dependencies:

   ```bash
   bun install
   # or
   npm install
   ```

3. Create a `.env.local` file with the following variables:

   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

4. Run the development server:

   ```bash
   bun dev
   # or
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 3D Models

The application requires 3D models for the chess pieces. You can:

1. Use free models from sources like [Sketchfab](https://sketchfab.com) or [TurboSquid](https://turbosquid.com)
2. Create your own models using Blender or other 3D modeling software
3. Purchase premium chess piece models

Place the models in the `public/models/chess/` directory with the following filenames:

- `pawn.glb`
- `rook.glb`
- `knight.glb`
- `bishop.glb`
- `queen.glb`
- `king.glb`

## Database Setup

Run the SQL migrations in the `sql/` directory to set up your Supabase database.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Three.js](https://threejs.org/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Drei](https://github.com/pmndrs/drei)
- [chess.js](https://github.com/jhlywa/chess.js)
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [OpenAI](https://openai.com/)
- [Stripe](https://stripe.com/)
