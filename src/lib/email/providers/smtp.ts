import type { EmailMessage, EmailProvider, EmailProviderConfig, EmailResult } from "../types";

export class SmtpProvider implements EmailProvider {
  name = "smtp";
  constructor(private config: EmailProviderConfig) {}
  async send(message: EmailMessage): Promise<EmailResult> {
    console.log("[smtp.send]", { to: message.to, subject: message.subject, from: this.config.fromAddress });
    return { success: true, messageId: `smtp-${crypto.randomUUID()}` };
  }
  async sendBatch(messages: EmailMessage[]): Promise<EmailResult[]> {
    return Promise.all(messages.map((m) => this.send(m)));
  }
  async testConnection(): Promise<EmailResult> {
    return { success: true };
  }
}