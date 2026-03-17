// Paystack payment integration for mobile money and card payments
import axios from "axios";

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

function headers() {
  return {
    Authorization: `Bearer ${getSecretKey()}`,
    "Content-Type": "application/json",
  };
}

export interface InitializePaymentParams {
  email: string;
  amount: number; // in pesewas (GHS * 100)
  reference: string;
  currency?: string;
  callback_url?: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
  mobile_money?: {
    phone: string;
    provider: string; // "mtn" | "vod" | "tgo"
  };
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: "success" | "failed" | "abandoned" | "pending";
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    paid_at: string | null;
    metadata: Record<string, unknown>;
    authorization: {
      authorization_code: string;
      channel: string;
    };
  };
}

export interface PaystackChargeResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: "success" | "send_otp" | "pay_offline" | "pending" | "failed";
    display_text?: string;
  };
}

/**
 * Initialize a transaction via Paystack's hosted checkout.
 * Supports card and mobile money channels.
 */
export async function initializeTransaction(
  params: InitializePaymentParams
): Promise<PaystackInitResponse> {
  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amount,
    reference: params.reference,
    currency: params.currency || "GHS",
    channels: params.channels || ["mobile_money", "card"],
    metadata: params.metadata || {},
  };

  if (params.callback_url) {
    body.callback_url = params.callback_url;
  }

  const response = await axios.post<PaystackInitResponse>(
    `${PAYSTACK_BASE}/transaction/initialize`,
    body,
    { headers: headers() }
  );
  return response.data;
}

/**
 * Charge mobile money directly via the Charge API.
 * Customer receives a prompt on their phone to authorize.
 */
export async function chargeMobileMoney(params: {
  email: string;
  amount: number; // pesewas
  reference: string;
  phone: string;
  provider: string; // "mtn" | "vod" | "tgo"
  metadata?: Record<string, unknown>;
}): Promise<PaystackChargeResponse> {
  const response = await axios.post<PaystackChargeResponse>(
    `${PAYSTACK_BASE}/charge`,
    {
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      currency: "GHS",
      mobile_money: {
        phone: params.phone,
        provider: params.provider,
      },
      metadata: params.metadata || {},
    },
    { headers: headers() }
  );
  return response.data;
}

/**
 * Verify a transaction's status.
 */
export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  const response = await axios.get<PaystackVerifyResponse>(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: headers() }
  );
  return response.data;
}

/**
 * Validate a webhook signature from Paystack.
 */
export function validateWebhookSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", getSecretKey())
    .update(body)
    .digest("hex");
  return hash === signature;
}

/**
 * Map Ghana phone provider prefix to Paystack provider code.
 * MTN: 024, 054, 055, 059
 * Vodafone: 020, 050
 * AirtelTigo: 026, 027, 057, 056
 */
export function detectMomoProvider(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  const local = cleaned.startsWith("233")
    ? "0" + cleaned.slice(3)
    : cleaned;
  const prefix = local.slice(0, 3);

  if (["024", "054", "055", "059"].includes(prefix)) return "mtn";
  if (["020", "050"].includes(prefix)) return "vod";
  if (["026", "027", "056", "057"].includes(prefix)) return "tgo";
  return "mtn"; // default to MTN as most common in Ghana
}
