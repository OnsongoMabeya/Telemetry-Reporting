# WhatsApp Alerting — Meta Cloud API Setup & Implementation Plan

## Phase 1 — Meta Setup (Manual steps)

### Step 1.1 — Add the number to WhatsApp Business Platform

The number `+254 737 309 079` is not yet on WhatsApp, which is ideal — no migration needed.

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** → select your existing BSI app (or create a new one — type: **Business**)
3. In the app dashboard, click **Add Product** → find **WhatsApp** → click **Set Up**
4. You'll be prompted to connect a **WhatsApp Business Account (WABA)** — connect it to your Facebook Business account
5. Under **WhatsApp → Getting Started**, click **Add phone number**
6. Enter `+254 737 309 079`, select **Kenya**, choose **SMS** or **Voice call** for verification
7. Enter the verification code received
8. Once verified, you'll see a **Phone Number ID** — copy and save it

> ✅ Share the Phone Number ID once done.

---

### Step 1.2 — Get your WhatsApp Business Account ID (WABA ID)

After Step 1.1:

1. In the left sidebar go to **WhatsApp → Overview**
2. You'll see **WhatsApp Business Account** with an ID like `1234567890123456`
3. Copy and save it

---

### Step 1.3 — Create a System User + Permanent Token

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click the **Settings (gear icon)** → **Business Settings**
3. Left sidebar → **Users** → **System Users**
4. Click **Add** → name it `BSI Telemetry Bot`, role: **Admin**
5. Click **Add Assets** → select **WhatsApp Accounts** → select your WABA → give it **Full Control**
6. Click **Generate New Token**:
   - Select your **BSI app**
   - Expiry: **Never**
   - Permissions to enable:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
7. Copy the token immediately — **it only shows once**

> ✅ Save as `WHATSAPP_ACCESS_TOKEN` in your `.env` file. Share confirmation when done.

---

### Step 1.4 — Register Test Recipients

1. In Meta Developer console → **WhatsApp → API Setup**
2. Under **To**, click **Manage phone number list**
3. Add both test numbers:
   - `+254725108178`
   - `+254719604019`
4. Each number will receive a WhatsApp OTP to confirm

> ✅ Confirm when both numbers are verified.

---

### Step 1.5 — Create Message Templates

Go to **WhatsApp → Message Templates** → **Create Template**

#### Template 1 — Offline Alert

| Field | Value |
| --- | --- |
| Name | `bsi_site_offline_alert` |
| Category | `UTILITY` |
| Language | `English (en)` |

**Body:**

```text
⚠️ *BSI Telemetry Alert*

*{{1}}* has gone offline and is no longer transmitting telemetry data.

📅 *Last data received:* {{2}}

📡 *Affected services:*
{{3}}

Please dispatch a technician to inspect the site equipment and restore connectivity. Update the fault log upon resolution.
```

**Variables:**

- `{{1}}` — Base station name (e.g. ELDORET)
- `{{2}}` — Last data received timestamp
- `{{3}}` — Affected services (comma separated)

---

#### Template 2 — Recovery

| Field    | Value                     |
|----------|---------------------------|
| Name     | `bsi_site_recovery_alert` |
| Category | `UTILITY`                 |
| Language | `English (en)`            |

**Body:**

```text
✅ *BSI Telemetry — Site Recovered*

*{{1}}* has resumed normal operations and is transmitting telemetry data.

📅 *Last data received:* {{2}}
⏱️ *Total downtime:* {{3}}

No further action is required.
```

**Variables:**

- `{{1}}` — Base station name
- `{{2}}` — Last data received timestamp
- `{{3}}` — Total downtime (e.g. 2h 15m)

> ✅ Submit both templates. Approval usually takes a few minutes to a few hours. Share confirmed template names when approved.

---

## Phase 2 — Code Implementation (after Phase 1 is complete)

### 2.1 — Database (Migration 014)

- Add `phone_number` column (nullable) to `users` table
- Add `recipient_phones` JSON column to `site_alert_configs` table

### 2.2 — WhatsApp Service

- New file: `backend/services/whatsappService.js`
- Functions:
  - `sendWhatsAppOfflineAlert({ to, baseStationName, lastDataReceived, affectedServices })`
  - `sendWhatsAppRecoveryAlert({ to, baseStationName, lastDataReceived, downtime })`
- API endpoint: `POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`
- Reads credentials from `.env`

### 2.3 — Scheduler Update

- In `checkOfflineSites()`, after sending email alerts, collect phone numbers from:
  - `recipient_phones` on the alert config (manually added)
  - `phone_number` on matched `recipient_users`
- Call WhatsApp alert functions alongside existing email sends

### 2.4 — Frontend: Alert Config Dialog

- Add phone number input (freeSolo Autocomplete, same pattern as external emails) to the Offline Alerts dialog

### 2.5 — Frontend: User Profile Panel

- New slide-out drawer triggered by clicking the user icon (top right)
- Editable fields: **Name**, **Email**, **Phone Number**
- Saves via `PUT /api/users/profile`

### 2.6 — Backend: Profile Route

- `PUT /api/users/profile` — updates `name`, `email`, `phone_number` for the authenticated user

---

## Environment Variables (add to `.env` after Phase 1)

```dotenv
WHATSAPP_ACCESS_TOKEN=your_system_user_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_WABA_ID=your_waba_id_here
```

---

## Checklist

- [ ] Step 1.1 — Number `+254 737 309 079` added and verified in Meta Developer console
- [ ] Step 1.2 — WABA ID copied and saved
- [ ] Step 1.3 — System User created, permanent token generated and saved to `.env`
- [ ] Step 1.4 — Test recipients `+254725108178` and `+254719604019` registered and verified
- [ ] Step 1.5 — Templates `bsi_site_offline_alert` and `bsi_site_recovery_alert` submitted and approved
- [ ] Phase 2 — Code implementation (starts after all above are checked off)
