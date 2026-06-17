# MorangoAI Automation Setup Guide: Vapi & n8n

This document provides step-by-step setup guides and copy-paste templates to connect **Vapi** (Voice Calling Agent), **n8n** (Workflow Automation), and **Supabase/PostgreSQL** with your Next.js CRM.

---

## 1. Vapi AI Assistant Configuration

### Assistant System Prompt
Configure your Vapi Assistant with this system prompt to ensure it collects all required information naturally:

```text
You are Max, an friendly, expert AI sales assistant representing MorangoAI. Your goal is to talk to prospective clients, understand their project requirements, gather their contact details, and schedule a deep-dive consultation meeting.

Follow these steps in the conversation:
1. Greet the customer professionally and ask how you can help them.
2. Ask about the service they need (choose from: AI Agent, Web Development, App Development, DevOps, AI Automation).
3. Politely collect their Name, Phone number, and Email address.
4. Ask for their Company Name (if applicable).
5. Find out their estimated Budget range (e.g. $1000 - $3000, $5000+).
6. Ask for their preferred Date & Time for a video call consultation.
7. Once all data is collected, tell the client: "Just a moment while I confirm those details on our calendar."
8. Immediately trigger the function call `create_lead` with all the gathered details.
9. After the tool returns success, thank the customer and let them know that an email confirmation and a Google Meet link are on their way.

Be professional, concise, and do not repeat yourself. Ask one question at a time.
```

### ⚙️ Vapi Tool (Custom Function) Setup
In your Vapi Dashboard, you need to create a **Custom Tool** to trigger lead creation directly to the Next.js CRM. Follow these steps:

1. Go to the **Vapi Dashboard** -> **Tools** -> click **Create Tool**.
2. Set the following fields in the Tool Creator UI:
   - **Name:** `create_lead`
   - **Type:** `Function` (sometimes listed as `webhook` or `Make Webhook Request` in Vapi)
   - **Url:** `https://<YOUR-NGROK-SUBDOMAIN>.ngrok-free.app/api/webhook/vapi` (Use your actual ngrok or production domain URL)
   - **Method:** `POST`
3. In the **Schema** box of the tool, paste **ONLY** the JSON Schema below (do not include outer wrapper objects, as Vapi expects the schema to start directly with `type: "object"`):

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Full name of the customer."
    },
    "phone": {
      "type": "string",
      "description": "Phone number in international E.164 format (e.g., +923001234567)."
    },
    "email": {
      "type": "string",
      "description": "Client email address."
    },
    "company": {
      "type": "string",
      "description": "Name of the client's company."
    },
    "service": {
      "type": "string",
      "enum": ["AI Agent", "Web Development", "App Development", "DevOps", "AI Automation"],
      "description": "Selected service required."
    },
    "budget": {
      "type": "string",
      "description": "Budget range mentioned by client (e.g., $1000 - $3000)."
    },
    "meeting_date": {
      "type": "string",
      "description": "Meeting date and time in ISO format or clear English description."
    },
    "status": {
      "type": "string",
      "enum": ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"],
      "description": "The status of the lead, determined by Vapi call analysis (e.g., 'Qualified' for hot leads, 'New Lead' for info-only)."
    },
    "lead_evaluation": {
      "type": "string",
      "description": "Evaluation of lead intent, formatted as '[Classification] - [1-Sentence Reason]'."
    }
  },
  "required": ["name", "phone", "email", "service"]
}
```

---

## 2. Dynamic Lead Updates & Calendar Bookings (How CRM Handles Vapi Data)

When the caller interacts with Vapi, the CRM's backend manages the incoming data stream directly:
1. **Dynamic Rescheduling:** If the caller reschedules or makes updates during the call, the webhook updates the existing record rather than creating duplicates.
2. **Conflict Prevention:** If a meeting date is busy, the webhook automatically responds to the Vapi Tool with three alternative open slots, prompting the voice assistant to suggest them.
3. **Calendar Booking:** If a slot is confirmed, the CRM books it directly on Google Calendar and sends the Google Meet link inside a confirmation email to the caller.
4. **Intent Evaluation:** At the end of the call, the AI-generated call summary, transcript, and intent classification are recorded in the lead's chronological CRM Notes.
