/**
 * Cloudflare Worker: Email Receiver and Webhook Forwarder
 * 
 * This worker processes incoming emails on your custom domain, parses them using the 
 * "postal-mime" library, and forwards the parsed data (sender, recipient, subject, text, HTML) 
 * via an authenticated HTTP POST request to your Express.js backend.
 * 
 * Setup Instructions:
 * 1. Run `npm install postal-mime` in your local project, or package it for Cloudflare.
 * 2. Deploy this worker script to Cloudflare.
 * 3. Set the following environment variables (secrets) in your Worker Settings:
 *    - EXPRESS_API_URL: e.g. "https://yourdomain.com/api/incoming-email" (or your Oracle VPS IP: "http://130.x.x.x:3000/api/incoming-email")
 *    - CF_WEBHOOK_SECRET: A strong password/token (must match the CF_WEBHOOK_SECRET in your Express .env)
 * 4. Configure Cloudflare Email Routing for your domain:
 *    - Enable Email Routing on your domain.
 *    - Set up a Catch-all (wildcard "*@yourdomain.com") destination and route it to this Worker.
 */

import PostalMime from "postal-mime";

export default {
  async email(message, env, ctx) {
    // 1. Get configuration
    const apiEndpoint = env.EXPRESS_API_URL || "http://your-vps-ip:3000/api/incoming-email";
    const webhookSecret = env.CF_WEBHOOK_SECRET || "SUPER_SECRET_CF_KEY_123";

    try {
      console.log(`Receiving email from ${message.from} to ${message.to}`);

      // 2. Read the raw email stream from Cloudflare
      const rawEmailReader = message.raw;
      const rawEmailResponse = new Response(rawEmailReader);
      const rawEmailArrayBuffer = await rawEmailResponse.arrayBuffer();

      // 3. Parse email using postal-mime
      const parser = new PostalMime();
      const parsedEmail = await parser.parse(rawEmailArrayBuffer);

      // 4. Extract necessary fields
      const payload = {
        to_address: message.to,
        from_address: message.from,
        subject: parsedEmail.subject || "(No Subject)",
        body_text: parsedEmail.text || "",
        body_html: parsedEmail.html || parsedEmail.text || ""
      };

      console.log(`Parsed email successfully. Subject: "${payload.subject}". Forwarding to Express API...`);

      // 5. POST to Express API with webhook authentication header
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": webhookSecret,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Express API returned status ${response.status}: ${errorText}`);
      }

      console.log("Email forwarded to Express API successfully.");

    } catch (error) {
      console.error("Error processing or forwarding email:", error);
      // We don't want to fail silent; throwing here will trigger Cloudflare bounce/error logs for troubleshooting
      throw error;
    }
  }
};
