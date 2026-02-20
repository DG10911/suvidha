import twilio from 'twilio';

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  }
  return twilio(accountSid, authToken);
}

export function getTwilioFromPhoneNumber() {
  const phone = process.env.TWILIO_PHONE_NUMBER;
  if (!phone) throw new Error('TWILIO_PHONE_NUMBER must be set');
  return phone;
}

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(toPhone: string): Promise<{ success: boolean; message: string }> {
  const otp = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(toPhone, { otp, expiresAt });

  try {
    const client = getTwilioClient();
    const fromPhone = getTwilioFromPhoneNumber();
    const formattedTo = toPhone.startsWith('+') ? toPhone : '+91' + toPhone;

    await client.messages.create({
      body: `Your Suvidha Kiosk OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      from: fromPhone,
      to: formattedTo,
    });

    console.log(`[OTP] Sent to ${formattedTo}`);
    return { success: true, message: "OTP sent successfully" };
  } catch (error: any) {
    console.error("[OTP] Failed to send SMS:", error.message);
    otpStore.delete(toPhone);
    return { success: false, message: "Failed to send OTP. Please try again." };
  }
}

export function verifyOtp(phone: string, otp: string): boolean {
  const stored = otpStore.get(phone);
  if (!stored) return false;

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return false;
  }

  if (stored.otp === otp) {
    otpStore.delete(phone);
    return true;
  }

  return false;
}
