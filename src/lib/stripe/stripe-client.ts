import Stripe from "stripe";

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
  description?: string;
};

// Define credit packages
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "basic",
    name: "Basic",
    credits: 50,
    price: 500, // $5.00
    description: "Perfect for beginners - 50 credits",
  },
  {
    id: "standard",
    name: "Standard",
    credits: 150,
    price: 1000, // $10.00
    description: "Most popular - 150 credits (33% more value)",
  },
  {
    id: "premium",
    name: "Premium",
    credits: 500,
    price: 2500, // $25.00
    description: "Best value - 500 credits (50% more value)",
  },
];

/**
 * Create a Stripe checkout session for purchasing credits
 */
export async function createCheckoutSession(
  packageId: string,
  userId: string,
  userEmail: string
): Promise<{ sessionId: string; url: string }> {
  const creditPackage = CREDIT_PACKAGES.find((pkg) => pkg.id === packageId);

  if (!creditPackage) {
    throw new Error(`Credit package with ID ${packageId} not found`);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${creditPackage.name} Credit Package`,
              description: `${creditPackage.credits} credits for 3D Chess with LLMs`,
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
    });

    return {
      sessionId: session.id,
      url: session.url || "",
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

/**
 * Verify a completed checkout session and return the credits to be added
 */
export async function verifyCheckoutSession(sessionId: string): Promise<{
  userId: string;
  credits: number;
  success: boolean;
}> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return {
        userId: session.metadata?.userId || "",
        credits: 0,
        success: false,
      };
    }

    return {
      userId: session.metadata?.userId || "",
      credits: parseInt(session.metadata?.credits || "0"),
      success: true,
    };
  } catch (error) {
    console.error("Error verifying checkout session:", error);
    throw error;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<{
  type: string;
  data: Stripe.Event.Data.Object;
}> {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    return {
      type: event.type,
      data: event.data.object,
    };
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    throw error;
  }
}
