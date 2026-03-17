export const VEHICLE_MAKES = [
  "Toyota", "Nissan", "Honda", "Hyundai", "Kia", "Mercedes-Benz", "BMW",
  "Volkswagen", "Ford", "Chevrolet", "Mitsubishi", "Suzuki", "Mazda",
  "Peugeot", "Renault", "Isuzu", "Land Rover", "Jeep", "Subaru",
  "Lexus", "Audi", "Volvo", "Opel", "Daewoo", "Tata", "MAN", "Iveco",
];

export const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
  "Northern", "Volta", "Upper East", "Upper West", "Brong-Ahafo",
  "Western North", "Ahafo", "Bono East", "Oti", "North East", "Savannah",
];

export const GHANA_CITIES = [
  "Accra", "Kumasi", "Tamale", "Takoradi", "Cape Coast", "Tema",
  "Sunyani", "Ho", "Koforidua", "Bolgatanga", "Wa", "Techiman",
];

export const PART_CONDITIONS = [
  { value: "new", label: "Brand New" },
  { value: "used", label: "Used / Tokunbo" },
  { value: "refurbished", label: "Refurbished" },
];

export const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "confirmed", label: "Confirmed", color: "blue" },
  { value: "processing", label: "Processing", color: "indigo" },
  { value: "shipped", label: "Shipped", color: "purple" },
  { value: "delivered", label: "Delivered", color: "green" },
  { value: "cancelled", label: "Cancelled", color: "red" },
];

// Valid order status transitions — key is current status, value is allowed next statuses
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isValidStatusTransition(from: string, to: string): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export const PAYMENT_METHODS = [
  { value: "mobile_money", label: "Mobile Money (MTN MoMo, Vodafone Cash)", icon: "Smartphone" },
  { value: "card", label: "Card Payment (Visa / Mastercard)", icon: "CreditCard" },
  { value: "pay_on_delivery", label: "Pay on Delivery", icon: "Banknote" },
] as const;

export type PaymentMethod = "pay_on_delivery" | "mobile_money" | "card";

export const MOMO_PROVIDERS = [
  { value: "mtn", label: "MTN Mobile Money", prefix: ["024", "054", "055", "059"] },
  { value: "vod", label: "Vodafone Cash", prefix: ["020", "050"] },
  { value: "tgo", label: "AirtelTigo Money", prefix: ["026", "027", "056", "057"] },
] as const;
export type PaymentStatus = "unpaid" | "paid" | "refunded";

// Ghana phone number validation (must be 10 digits starting with 0, or 12 digits starting with 233)
export function isValidGhanaPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^0[2-9]\d{8}$/.test(cleaned) || /^233[2-9]\d{8}$/.test(cleaned);
}

export function formatGHS(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `GH₵${num.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const ghPhone = cleanPhone.startsWith("0") ? `233${cleanPhone.slice(1)}` : cleanPhone.startsWith("233") ? cleanPhone : `233${cleanPhone}`;
  return `https://wa.me/${ghPhone}?text=${encodeURIComponent(message)}`;
}
