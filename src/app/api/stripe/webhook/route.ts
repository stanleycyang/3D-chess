import { NextRequest, NextResponse } from "next/server";
import {
  handleStripeWebhook,
  verifyCheckoutSession,
} from "@/lib/stripe/stripe-client";
import { updateUserCredits } from "@/lib/db/supabase";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    // Handle the webhook event
    const { type, data } = await handleStripeWebhook(body, signature);

    // Process the event based on its type
    if (type === "checkout.session.completed") {
      // Cast data to Stripe.Checkout.Session
      const session = data as Stripe.Checkout.Session;
      const sessionId = session.id;

      // Verify the checkout session
      const { userId, credits, success } = await verifyCheckoutSession(
        sessionId
      );

      if (success && userId && credits > 0) {
        // Add credits to the user
        await updateUserCredits(
          userId,
          credits,
          "purchase",
          `Purchased ${credits} credits`
        );

        console.log(`Added ${credits} credits to user ${userId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
