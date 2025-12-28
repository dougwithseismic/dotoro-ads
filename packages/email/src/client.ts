import { Resend } from "resend";
import {
  isValidEmail,
  type EmailClient,
  type EmailClientOptions,
  type EmailResult,
  type SendEmailOptions,
} from "./types.js";

// Singleton instance
let clientInstance: EmailClient | null = null;

/**
 * Console fallback client for development without API key
 * Logs emails to console instead of sending them
 */
function createConsoleFallbackClient(): EmailClient {
  return {
    isConsoleFallback: true,
    send: async (options: SendEmailOptions): Promise<EmailResult> => {
      const messageId = `dev_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log("\n========================================");
      console.log("EMAIL SENT (Development Console Fallback)");
      console.log("========================================");
      console.log(`Message ID: ${messageId}`);
      console.log(`To: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
      console.log(`From: ${options.from || process.env.EMAIL_FROM || "noreply@example.com"}`);
      console.log(`Subject: ${options.subject}`);
      console.log("----------------------------------------");
      if (options.html) {
        console.log("HTML Content (truncated):");
        console.log(options.html.substring(0, 500) + (options.html.length > 500 ? "..." : ""));
      }
      if (options.text) {
        console.log("Text Content:");
        console.log(options.text);
      }
      console.log("========================================\n");

      return {
        success: true,
        messageId,
      };
    },
  };
}

/**
 * Creates a Resend-backed email client
 */
function createResendClient(apiKey: string): EmailClient {
  const resend = new Resend(apiKey);

  return {
    isConsoleFallback: false,
    send: async (options: SendEmailOptions): Promise<EmailResult> => {
      const from = options.from || process.env.EMAIL_FROM || "noreply@example.com";

      const { data, error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        react: options.react,
        replyTo: options.replyTo,
        headers: options.headers,
        tags: options.tags,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        messageId: data?.id || "unknown",
      };
    },
  };
}

/**
 * Creates or returns the email client singleton
 *
 * In production, requires RESEND_API_KEY to be set.
 * In development, falls back to console logging if no API key is present.
 *
 * @param options - Client options
 * @returns EmailClient instance
 * @throws Error if RESEND_API_KEY is not set in production
 *
 * @example
 * ```ts
 * const client = createEmailClient();
 * await client.send({
 *   to: 'user@example.com',
 *   subject: 'Hello',
 *   html: '<p>Hello World</p>'
 * });
 * ```
 */
export function createEmailClient(options: EmailClientOptions = {}): EmailClient {
  const { apiKey, forceNew = false } = options;

  // Return existing instance if available and not forcing new
  if (clientInstance && !forceNew) {
    return clientInstance;
  }

  const resolvedApiKey = apiKey || process.env.RESEND_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  // In production, API key is required
  if (isProduction && !resolvedApiKey) {
    throw new Error(
      "RESEND_API_KEY environment variable is required in production mode"
    );
  }

  // In development without API key, use console fallback
  if (!resolvedApiKey) {
    const client = createConsoleFallbackClient();
    if (!forceNew) {
      clientInstance = client;
    }
    return client;
  }

  // Create Resend client
  const client = createResendClient(resolvedApiKey);
  if (!forceNew) {
    clientInstance = client;
  }
  return client;
}

/**
 * Validates send email options
 * @returns null if valid, error message if invalid
 */
function validateSendOptions(options: SendEmailOptions): string | null {
  // Validate 'to' field
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  for (const email of recipients) {
    if (!isValidEmail(email)) {
      return `Invalid email address: ${email}`;
    }
  }

  // Validate subject
  if (!options.subject || options.subject.trim() === "") {
    return "Email subject is required";
  }

  // Validate content - need either html, text, or react
  if (!options.html && !options.text && !options.react) {
    return "Email content is required (html, text, or react)";
  }

  return null;
}

/**
 * Sends an email using the provided or default client
 *
 * @param options - Email options
 * @param client - Optional email client (uses singleton if not provided)
 * @returns EmailResult with success status and messageId or error
 *
 * @example
 * ```ts
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to our app</h1>'
 * });
 *
 * if (result.success) {
 *   console.log('Sent:', result.messageId);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export async function sendEmail(
  options: SendEmailOptions,
  client?: EmailClient
): Promise<EmailResult> {
  // Validate options
  const validationError = validateSendOptions(options);
  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  // Get or create client
  const emailClient = client || createEmailClient();

  try {
    return await emailClient.send(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
    };
  }
}

// Re-export types for convenience
export type { EmailClient, EmailClientOptions, EmailResult, SendEmailOptions };
