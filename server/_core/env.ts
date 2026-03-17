export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Paystack
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
  paystackPublicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY ?? "",
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Twilio (for WhatsApp OTP and messaging)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioVerifySid: process.env.TWILIO_VERIFY_SERVICE_SID ?? "",
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
};
