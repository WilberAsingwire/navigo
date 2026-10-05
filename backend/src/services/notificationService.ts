import axios from 'axios';
import nodemailer from 'nodemailer';
import { normalizeUgPhone } from '../utils/uganda';

interface NotificationService {
  sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }>;
  sendEmail(email: string, subject: string, message: string): Promise<{ success: boolean; error?: string }>;
}

class NotificationServiceInstance implements NotificationService {
  private readonly smsApiKey = process.env.AFRICAS_TALKING_API_KEY;
  private readonly smsUsername = process.env.AFRICAS_TALKING_USERNAME;
  private readonly emailUser = process.env.EMAIL_USER;
  private readonly emailPass = process.env.EMAIL_PASS;

  async sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.smsApiKey || !this.smsUsername) {
      console.error('SMS Credentials missing in .env');
      return { success: false, error: 'SMS configuration missing' };
    }

    // Africa's Talking requires international format (+2567XXXXXXXX);
    // local 07XX numbers are silently undeliverable.
    const intlPhone = normalizeUgPhone(phone);
    if (!intlPhone) {
      console.error(`SMS not sent — invalid Ugandan phone: ${phone}`);
      return { success: false, error: 'Invalid phone number format' };
    }

    try {
      // Africa's Talking SMS API
      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        `apiKey=${this.smsApiKey}&username=${this.smsUsername}&to=${encodeURIComponent(intlPhone)}&message=${encodeURIComponent(message)}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      if (response.data.SMSMessageData) {
        return { success: true };
      }
      return { success: false, error: 'Failed to send SMS via Africa Talking' };
    } catch (error: any) {
      console.error('SMS Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.errorMessage || 'SMS delivery failed' };
    }
  }

  async sendEmail(email: string, subject: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.emailUser || !this.emailPass) {
      console.error('Email Credentials missing in .env');
      return { success: false, error: 'Email configuration missing' };
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.emailUser,
          pass: this.emailPass,
        },
      });

      await transporter.sendMail({
        from: `"NAVIGO Support" <${this.emailUser}>`,
        to: email,
        subject: subject,
        text: message,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                 <h2 style="color: #FF6B35;">NAVIGO Account Security</h2>
                 <p>${message}</p>
                 <p style="font-size: 12px; color: #888;">This is an automated security message. Please do not share your code with anyone.</p>
               </div>`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Email Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const notificationService = new NotificationServiceInstance();
