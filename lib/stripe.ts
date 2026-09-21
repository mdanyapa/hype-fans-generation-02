import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey || stripeSecretKey.includes('your_')) {
  console.warn('⚠️ STRIPE_SECRET_KEY is not set or using placeholder value. Stripe payments will not work.')
}

export const stripe = stripeSecretKey && !stripeSecretKey.includes('your_')
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    })
  : null as unknown as Stripe // This will cause errors when used, which is intended

// Check if Stripe is properly configured
export function isStripeConfigured(): boolean {
  return !!(stripeSecretKey && !stripeSecretKey.includes('your_'))
}

// Helper to format amount for Stripe (convert to cents)
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100)
}

// Helper to format amount from Stripe (convert from cents)
export function formatAmountFromStripe(amount: number): number {
  return amount / 100
}
