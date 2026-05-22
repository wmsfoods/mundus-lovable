import type { EmailMessage, EmailProvider, EmailProviderConfig, EmailResult } from "../types";

export class MicrosoftProvider implements EmailProvider {
  name = "microsoft";
  constructor(private config: EmailProviderConfig) {}
  async send(message: EmailMessage): Promise<EmailResult> {
    console.log("[microsoft.send]", { to: message.to, subject: message.subject, from: this.config.fromAddress });
    return { success: true, messageId: `ms-${crypto.randomUUID()}` };
  }
  async sendBatch(messages: EmailMessage[]): Promise<EmailResult[]> {
    return Promise.all(messages.map((m) => this.send(m)));
  }
  async testConnection(): Promise<EmailResult> {
    return { success: true };
  }
}