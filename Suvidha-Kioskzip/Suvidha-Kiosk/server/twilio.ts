import twilio from 'twilio';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
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
    const client = await getTwilioClient();
    const fromPhone = await getTwilioFromPhoneNumber();

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
