export interface EmailMessage {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  trackingId?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProviderConfig {
  provider: "zoho" | "microsoft" | "smtp" | "sendgrid";
  displayName: string;
  fromAddress: string;
  replyTo?: string | null;
  credentials: Record<string, unknown>;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailResult>;
  sendBatch(messages: EmailMessage[]): Promise<EmailResult[]>;
  testConnection(): Promise<EmailResult>;
}