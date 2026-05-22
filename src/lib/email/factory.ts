import type { EmailProvider, EmailProviderConfig } from "./types";
import { ZohoProvider } from "./providers/zoho";
import { MicrosoftProvider } from "./providers/microsoft";
import { SmtpProvider } from "./providers/smtp";

export function createEmailProvider(config: EmailProviderConfig): EmailProvider {
  switch (config.provider) {
    case "zoho":
    case "sendgrid":
      return new ZohoProvider(config);
    case "microsoft":
      return new MicrosoftProvider(config);
    case "smtp":
      return new SmtpProvider(config);
    default:
      throw new Error(`Unknown email provider: ${(config as { provider: string }).provider}`);
  }
}