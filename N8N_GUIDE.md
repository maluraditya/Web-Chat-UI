# N8N Integration Guide

This guide explains how to connect your n8n workflow to the Next.js WhatsApp Inbox to enable the **Human Handoff** feature.

## Concept
1.  **Incoming Message**: n8n triggers when a message arrives.
2.  **Check Status**: n8n asks your App "Is this user chatting with a bot or a human?".
3.  **Bot Mode**: If status is `bot`, n8n runs the AI Agent and replies.
4.  **Human Mode**: If status is `human`, n8n **stops**. It does nothing. The human agent replies from the Inbox.

## Workflow Setup

### Step 1: HTTP Request (Check Status)
Add an **HTTP Request** node right after your **WhatsApp Trigger**.

*   **Method**: `POST`
*   **URL**: `https://your-vercel-app.vercel.app/api/whatsapp/incoming`
*   **Authentication**: None (or Header Auth if you added it).
*   **Body Parameters** (JSON):
    ```json
    {
      "phone": "={{ $('WhatsApp Trigger').item.json.from }}",
      "name": "={{ $('WhatsApp Trigger').item.json.contacts[0].profile.name }}",
      "message": "={{ $('WhatsApp Trigger').item.json.messages[0].text.body }}"
    }
    ```

**Important**: This node will return:
```json
{
  "success": true,
  "status": "bot"  // or "human"
}
```

### Step 2: If Switch (Router)
Add an **If** node after the HTTP Request.

*   **Condition**: String
*   **Value 1**: `{{ $json.status }}`
*   **Operation**: Equal
*   **Value 2**: `bot`

**Outputs**:
*   **True**: Connect to your **AI Agent** setup.
*   **False**: Leave empty (End of workflow).

### Step 3: AI Agent & Reply
Connect the **True** output of the If node to your existing AI Agent chain.
*   The AI Agent processes the message.
*   The **WhatsApp Send** node sends the reply.

---

## Outgoing Messages (Bot Reply Logging)

When your AI Agent sends a reply, you must **log it** to your database so it appears in the Inbox.

1.  **After** the "WhatsApp Send" node in your workflow, add another **HTTP Request** node.
2.  **Method**: `POST`
3.  **URL**: `https://your-vercel-app.vercel.app/api/whatsapp/bot`
4.  **Body Parameters** (JSON):
    ```json
    {
      "phone": "={{ $('WhatsApp Trigger').item.json.from }}",
      "message": "={{ $json.output }}" 
    }
    ```
    *(Note: `$json.output` is usually where the AI response text is stored. Adjust if your variable is different).*

## Check Status (Optional)
If you want to check the status *without* waiting for an incoming message (e.g. before sending a proactive message), use this API:

1.  **HTTP Request Node**
2.  **Method**: `POST`
3.  **URL**: `https://your-vercel-app.vercel.app/api/whatsapp/check-status`
4.  **Body**:
    ```json
    { "phone": "+919999999999" }
    ```
5.  **Output**: `{ "status": "bot" }` or `{ "status": "human" }`

## Outgoing Messages (Human Reply)
You need a **second workflow** (or a separate specific webhook) for when YOU reply from the Inbox.

1.  **Trigger**: Webhook
    *   **Method**: POST
    *   **Path**: `send-whatsapp`
    *   This is the URL you put in your `.env.local` as `N8N_SEND_WEBHOOK_URL`.
    ```json
    {
      "body": {
        "phone": "+919999999999",
        "message": "Hello from human agent",
        "status": "human" // NEW: You can use this to route logic in N8N
      }
    }
    ```
2.  Map your **WhatsApp Send** node to use:
    *   Phone: `{{ $json.body.phone }}`
    *   Message: `{{ $json.body.message }}`

## Summary
*   **Incoming**: Trigger -> HTTP Request (App) -> IF 'bot' -> AI Agent -> Reply.
*   **Outgoing**: Webhook (from App) -> Send WhatsApp.
