import type { EmailMessage, EmailProvider, EmailProviderConfig, EmailResult } from "../types";

export class ZohoProvider implements EmailProvider {
  name = "zoho";
  constructor(private config: EmailProviderConfig) {}
  async send(message: EmailMessage): Promise<EmailResult> {
    console.log("[zoho.send]", { to: message.to, subject: message.subject, from: this.config.fromAddress });
    return { success: true, messageId: `zoho-${crypto.randomUUID()}` };
  }
  async sendBatch(messages: EmailMessage[]): Promise<EmailResult[]> {
    return Promise.all(messages.map((m) => this.send(m)));
  }
  async testConnection(): Promise<EmailResult> {
    console.log("[zoho.test]", this.config.fromAddress);
    return { success: true };
  }
}