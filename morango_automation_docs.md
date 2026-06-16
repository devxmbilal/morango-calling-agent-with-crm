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

### Vapi Tool (Function Call) Schema
In the Vapi Dashboard, create a **Custom Tool** named `create_lead` with the following JSON schema:

```json
{
  "name": "create_lead",
  "description": "Saves lead details and schedules a consultation meeting in the database.",
  "parameters": {
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
      }
    },
    "required": ["name", "phone", "email", "service"]
  }
}
```

---

## 2. n8n Workflow Configuration

You can build two workflows or one unified workflow in n8n.
Below is the blueprint for the **unified lead booking flow**.

### n8n Workflow JSON (Copy & Paste directly into your n8n canvas!)
Copy the JSON below and paste it (`Ctrl + V`) directly onto an empty n8n canvas:

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "vapi-create-lead",
        "options": {}
      },
      "id": "e5b87440-1fa1-419b-a010-85f02bc736a5",
      "name": "Vapi Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 360]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.body.message.type }}",
              "value2": "function-call"
            }
          ]
        }
      },
      "id": "c13876e5-4fdf-4e2b-88a4-04ea4fdb7ee0",
      "name": "Is Function Call?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [450, 360]
    },
    {
      "parameters": {
        "operation": "create",
        "table": {
          "__rl": true,
          "value": "leads",
          "mode": "list",
          "cachedResultName": "leads"
        },
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "name": "={{ $json.body.message.functionCall.arguments.name }}",
            "phone": "={{ $json.body.message.functionCall.arguments.phone }}",
            "email": "={{ $json.body.message.functionCall.arguments.email }}",
            "company": "={{ $json.body.message.functionCall.arguments.company }}",
            "service": "={{ $json.body.message.functionCall.arguments.service }}",
            "budget": "={{ $json.body.message.functionCall.arguments.budget }}",
            "source": "Vapi Call",
            "status": "New Lead",
            "vapi_call_id": "={{ $json.body.message.call.id }}"
          },
          "matchingColumns": [],
          "schema": []
        },
        "options": {}
      },
      "id": "a189f7d2-a7f4-4df1-bd7b-60be79b767ef",
      "name": "Supabase: Save Lead",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [680, 340]
    },
    {
      "parameters": {
        "calendarId": "primary",
        "start": "={{ $json.body.message.functionCall.arguments.meeting_date }}",
        "end": "={{ new Date(new Date($json.body.message.functionCall.arguments.meeting_date).getTime() + 30 * 60 * 1000).toISOString() }}",
        "summary": "=MorangoAI Consultation: {{ $json.body.message.functionCall.arguments.name }}",
        "description": "Consultation about {{ $json.body.message.functionCall.arguments.service }} service. Budget: {{ $json.body.message.functionCall.arguments.budget }}",
        "attendees": [
          "={{ $json.body.message.functionCall.arguments.email }}"
        ],
        "additionalFields": {
          "conferenceData": {
            "createRequest": {
              "requestId": "={{ Math.random().toString(36).substring(7) }}",
              "conferenceSolutionKey": {
                "type": "hangoutsMeet"
              }
            }
          }
        }
      },
      "id": "f5f0b5d9-7e9b-4e6f-87a2-f674513101fe",
      "name": "Google Calendar: Book Event",
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1,
      "position": [900, 340]
    },
    {
      "parameters": {
        "operation": "create",
        "table": {
          "__rl": true,
          "value": "meetings",
          "mode": "list",
          "cachedResultName": "meetings"
        },
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "lead_id": "={{ $node[\"Supabase: Save Lead\"].json.id }}",
            "meeting_date": "={{ $node[\"Google Calendar: Book Event\"].json.start.dateTime }}",
            "meeting_link": "={{ $node[\"Google Calendar: Book Event\"].json.htmlLink }}",
            "status": "Scheduled"
          },
          "matchingColumns": [],
          "schema": []
        },
        "options": {}
      },
      "id": "d1e7c5b4-7b6c-482d-8df5-a7b6c5d4e3f1",
      "name": "Supabase: Save Meeting",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1120, 340]
    },
    {
      "parameters": {
        "fromEmail": "sales@morangoai.com",
        "toEmail": "={{ $node[\"Supabase: Save Lead\"].json.email }}",
        "subject": "Meeting Confirmed: MorangoAI Consultation",
        "html": "<p>Hello {{ $node[\"Supabase: Save Lead\"].json.name }},</p><p>Your consultation meeting for <b>{{ $node[\"Supabase: Save Lead\"].json.service }}</b> has been scheduled.</p><p><b>Meeting Link:</b> <a href=\"{{ $node[\"Google Calendar: Book Event\"].json.hangoutLink }}\">{{ $node[\"Google Calendar: Book Event\"].json.hangoutLink }}</a></p><p>Thank you for choosing MorangoAI!</p>"
      },
      "id": "b7c2b7c2-7b6c-482d-8df5-a7b6c5d4e3f2",
      "name": "Resend: Send Email",
      "type": "n8n-nodes-base.email",
      "typeVersion": 1,
      "position": [1340, 340]
    }
  ],
  "connections": {
    "Vapi Webhook": {
      "main": [
        [
          {
            "node": "Is Function Call?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Function Call?": {
      "main": [
        [
          {
            "node": "Supabase: Save Lead",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase: Save Lead": {
      "main": [
        [
          {
            "node": "Google Calendar: Book Event",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Google Calendar: Book Event": {
      "main": [
        [
          {
            "node": "Supabase: Save Meeting",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase: Save Meeting": {
      "main": [
        [
          {
            "node": "Resend: Send Email",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 3. Calendly Integration (Alternative)

If you prefer using Calendly redirection instead of booking dates on the voice call:

1. **Vapi Prompt Setup:** Guide the assistant to say: "I have saved your details. I am sending a link to your email and phone so you can pick a convenient slot on our calendar."
2. **n8n Action (Trigger SMS/Email):**
   - Vapi triggers `create_lead` (without `meeting_date`).
   - n8n saves the lead to Supabase, then triggers an email/WhatsApp with the Calendly link: `https://calendly.com/your-morangoai-link`.
3. **Calendly Webhook Trigger:**
   - In Calendly, configure a webhook to trigger when an event is scheduled.
   - Point the Calendly webhook to a new n8n Webhook node.
   - n8n parses the Calendly payload (matching the customer's email) and inserts the meeting into the `meetings` table in Supabase, updating the lead's status to **Contacted** or **Qualified**.
