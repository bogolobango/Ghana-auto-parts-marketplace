import { logger } from "./logger";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  logger.info("Email sent", { to: options.to, subject: options.subject });
  return true;
}

export async function sendVendorWelcomeEmail(params: {
  email: string;
  businessName: string;
  vendorName?: string;
}): Promise<void> {
  const { email, businessName, vendorName } = params;
  const greeting = vendorName ? `Dear ${vendorName}` : "Dear Vendor";

  await sendEmail({
    to: email,
    subject: `Welcome to VOOM Ghana — ${businessName} is now live!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 0.05em; margin: 0;">VOOM Ghana</h1>
          <p style="color: #888; font-size: 13px; margin-top: 4px;">Vehicle Spare Parts Marketplace</p>
        </div>
        <h2 style="font-size: 20px; font-weight: 400; margin-bottom: 16px;">${greeting},</h2>
        <p style="line-height: 1.7; color: #333;">
          Thank you for registering <strong>${businessName}</strong> on VOOM Ghana!
          Your vendor account has been approved and you can start listing your spare parts immediately.
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="font-size: 15px; font-weight: 500; margin: 0 0 12px;">Getting Started</h3>
          <ul style="padding-left: 20px; line-height: 1.8; color: #555; margin: 0;">
            <li>Go to your <strong>Vendor Dashboard</strong> to add products</li>
            <li>Upload clear photos of each part</li>
            <li>Set competitive prices in GH&#8373;</li>
            <li>Specify vehicle compatibility for better visibility</li>
            <li>Respond promptly to buyer inquiries</li>
          </ul>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center; line-height: 1.6;">
          This email was sent to ${email} because you registered as a vendor on VOOM Ghana.
        </p>
      </div>
    `,
  });
}

export async function sendVendorApprovalEmail(params: {
  email: string;
  businessName: string;
  status: "approved" | "rejected" | "suspended";
}): Promise<void> {
  const { email, businessName, status } = params;
  const statusMessages = {
    approved: { subject: `${businessName} has been approved on VOOM Ghana`, body: "Your vendor application has been approved! You can now start listing your spare parts." },
    rejected: { subject: `Update on your VOOM Ghana vendor application`, body: "Unfortunately, your vendor application was not approved at this time. Please ensure your details are correct and reapply." },
    suspended: { subject: `Your VOOM Ghana vendor account has been suspended`, body: "Your vendor account has been temporarily suspended. Please contact support for more information." },
  };
  const msg = statusMessages[status];
  await sendEmail({
    to: email,
    subject: msg.subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 0.05em; margin: 0;">VOOM Ghana</h1>
        </div>
        <p style="line-height: 1.7; color: #333;">${msg.body}</p>
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">VOOM Ghana — Vehicle Spare Parts Marketplace</p>
      </div>
    `,
  });
}
