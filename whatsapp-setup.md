# WhatsApp Alerting — Meta Cloud API Setup & Implementation Plan

## Phase 1 — Meta Setup (Manual steps)

### Step 1.1 — Add the number to WhatsApp Business Platform

The number `+254 700 111 222` (use the correct number) is not yet on WhatsApp, which is ideal — no migration needed.

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** → select your existing BSI app (or create a new one — type: **Business**)
3. In the app dashboard, click **Add Product** → find **WhatsApp** → click **Set Up**
4. You'll be prompted to connect a **WhatsApp Business Account (WABA)** — connect it to your Facebook Business account
5. Under **WhatsApp → Getting Started**, click **Add phone number**
6. Enter `+254 700 111 222`, select **Kenya**, choose **SMS** or **Voice call** for verification
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
   - `+254712323445`
   - `+254723434556`
4. Each number will receive a WhatsApp OTP to confirm

> ✅ Confirm when both numbers are verified.

---

### Step 1.5 — Create Message Templates

Go to **WhatsApp → Message Templates** → **Create Template**

#### Template 1 — Offline Alert

| Field    | Value                    |
|----------|--------------------------|
| Name     | `bsi_site_offline_alert` |
| Category | `UTILITY`                |
| Language | `English (en)`           |

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

## Phase 2 — Code Implementation (Detailed Phased Plan)

### Pricing Note

Meta offers **1,000 free conversations per month per category** (Utility, Marketing, Authentication, Service) per WABA. Your alerts are **Utility** messages, so you get 1,000 free utility conversations monthly. After that, Kenya pricing is approximately **$0.003–$0.005 per message**. A "conversation" lasts 24 hours from the first message.

---

### Phase 2.1 — Foundation (Database & Environment)

***Estimated: 30 mins***

1. **Database Migration `014`**
   - Add `phone_number VARCHAR(20) NULL` to `users` table
   - Add `recipient_phones JSON NULL` to `site_alert_configs` table
   - Update migration runner (`setup.js`) to include migration 014

2. **Environment Configuration**

   - Confirm `.env` has:

     ```env
     WHATSAPP_ACCESS_TOKEN=your_token_here
     WHATSAPP_PHONE_NUMBER_ID=1132558289948106
     WHATSAPP_WABA_ID=2211600009616360
     ```

**Deliverable:** Database schema updated, migration runs automatically on next deploy

---

### Phase 2.2 — WhatsApp Service Module

***Estimated: 45 mins***

1. **Create `backend/services/whatsappService.js`**
   - `sendTemplateMessage({ to, templateName, languageCode, components })` — generic Meta API caller
   - `sendWhatsAppOfflineAlert({ to, baseStationName, lastDataReceived, affectedServices })` — uses `bsi_site_offline_alert` template
   - `sendWhatsAppRecoveryAlert({ to, baseStationName, lastDataReceived, downtime })` — uses `bsi_site_recovery_alert` template
   - Error handling and logging
   - Phone number formatting (ensure +254... format)

2. **Template mapping**
   - Offline: `bsi_site_offline_alert` with variables `[baseStationName, lastDataReceived, affectedServicesList]`
   - Recovery: `bsi_site_recovery_alert` with variables `[baseStationName, lastDataReceived, downtime]`

**Deliverable:** Backend can send WhatsApp messages via Meta API

---

### Phase 2.3 — Scheduler Integration

***Estimated: 30 mins***

1. **Update `scheduler.js` `checkOfflineSites()`**
   - After collecting email recipients, also collect phone numbers from:
     - `config.recipient_phones` (manual numbers stored as JSON)
     - `users.phone_number` for matched `recipient_users`
   - Format numbers (remove spaces, ensure +254 prefix)
   - Call `sendWhatsAppOfflineAlert` / `sendWhatsAppRecoveryAlert` alongside existing email sends
   - Log WhatsApp delivery results

**Deliverable:** Scheduler automatically sends WhatsApp alerts when sites go offline/recover

---

### Phase 2.4 — Frontend — Alert Config Dialog

***Estimated: 45 mins***

1. **Update Offline Alerts dialog in `Alerts.js`**
   - Add phone number input field (Autocomplete with freeSolo, same pattern as external emails)
   - Store as array in `recipient_phones` state
   - Display chips for entered numbers
   - Save/load with alert config

2. **Validation**
   - Basic phone format validation (starts with +, minimum length)
   - Allow multiple numbers per config

**Deliverable:** Users can add phone numbers to alert configs in the UI

---

### Phase 2.5 — Frontend — User Profile Panel

***Estimated: 60 mins***

1. **Create `UserProfileDrawer` component**
   - Slide-out drawer from right side
   - Triggered by clicking user icon (top right of app bar)
   - Fields: Name, Email, Phone Number
   - Save/Cancel buttons

2. **Add to layout**
   - Modify top AppBar to handle user icon click
   - Open drawer with current user data pre-filled

3. **API integration**
   - `GET /api/users/profile` — fetch current user profile
   - `PUT /api/users/profile` — update name, email, phone_number

**Deliverable:** Users can edit their own profile including phone number

---

### Phase 2.6 — Backend — User Profile Routes

***Estimated: 30 mins***

1. **Create `backend/routes/users.js`** (or extend existing)
   - `GET /api/users/profile` — return current authenticated user's profile (id, name, email, phone_number)
   - `PUT /api/users/profile` — update own profile (name, email, phone_number)
   - Validation: phone number format, email format

2. **Register route** in `server.js`

**Deliverable:** API endpoints for user profile management

---

### Phase 2.7 — Testing & Documentation

***Estimated: 30 mins***

1. **Test plan**
   - Test phone number added via alert config
   - Test phone number added via user profile
   - Verify scheduler collects both sources
   - Verify Meta API payload is correctly formatted

2. **Update this document**
   - Mark all checklist items complete
   - Add testing instructions

**Deliverable:** System fully tested and documented

---

## Phase Dependencies & Execution Order

```text
Phase 2.1 (DB) → Phase 2.2 (Service) → Phase 2.3 (Scheduler)
     ↓              ↓                      ↓
     └──────────────┴──────────────────────┘
              ↓
         Can test backend with manual API call
              ↓
Phase 2.4 (Alert UI) ──┐
                       ├──→ Phase 2.7 (Testing)
Phase 2.6 (Profile API)─┘
                       ↓
                Phase 2.5 (Profile UI)
```

**Backend phases (2.1-2.3, 2.6) are independent of frontend phases (2.4, 2.5) and can run in parallel.**

---

## Deliverables Per Phase (Testing Checklist)

| Phase | Deliverable                        | How to Test                              |
|-------|------------------------------------|------------------------------------------|
| 2.1   | Migration file, DB columns created | Check MySQL schema                       |
| 2.2   | `whatsappService.js`               | curl test to send message                |
| 2.3   | Scheduler sends WhatsApp           | Trigger `/api/site-alerts/run-check`     |
| 2.4   | Alert dialog has phone input       | UI visible in browser                    |
| 2.6   | User can update phone via API      | curl/Postman to `PUT /api/users/profile` |
| 2.5   | User profile drawer in UI          | Click user icon                          |
| 2.7   | Full integration tested            | End-to-end offline alert test            |

---

## Environment Variables (add to `.env` after Phase 1)

```dotenv
WHATSAPP_ACCESS_TOKEN=your_system_user_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_WABA_ID=your_waba_id_here
```

---

## Checklist

- [✅] Step 1.1 — Number `+254 700 111 222` (use your number) added and verified in Meta Developer console
- [✅] Step 1.2 — WABA ID copied and saved
- [✅] Step 1.3 — System User created, permanent token generated and saved to `.env`
- [✅] Step 1.4 — Test recipients numbers registered and verified
- [✅] Step 1.5 — Templates `bsi_site_offline_alert` and `bsi_site_recovery_alert` submitted and approved
- [✅] Phase 2 — Code implementation complete

---

## Phase 2.7: Testing Guide

### Testing Without Meta Billing (Pre-Production)

All functionality can be tested without WhatsApp billing setup. The system gracefully degrades to email-only alerts when WhatsApp is not configured.

#### 1. Database Schema Test

```bash
# Verify columns exist
mysql -u root -p -e "USE bsi_telemetry; SHOW COLUMNS FROM users LIKE 'phone_number';"
mysql -u root -p -e "USE bsi_telemetry; SHOW COLUMNS FROM site_alert_configs LIKE 'recipient_phones';"
```

**Expected:** Both queries return column definitions.

#### 2. Profile API Test

```bash
# Get profile (requires JWT token)
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update phone number
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+254712345678", "email": "test@example.com"}'
```

**Expected:** `success: true`, phone number normalized (spaces removed).

#### 3. Alert Config Phone Input Test

```bash
# Create alert config with phone numbers
curl -X POST http://localhost:5000/api/site-alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "baseStationName": "TestStation",
    "recipientUsers": [1],
    "recipientEmails": ["admin@example.com"],
    "recipientPhones": ["+254712345678", "+254798765432"]
  }'
```

**Expected:** Config created with phones stored as JSON array.

#### 4. WhatsApp Service Configuration Test

Without env vars set:

```bash
# Test endpoint returns 503 when not configured
curl -X POST http://localhost:5000/api/site-alerts/test-whatsapp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+254712345678"}'
```

**Expected:** `{"success": false, "configured": false, ...}`

With env vars set:

```bash
# Verify startup log shows "WhatsApp service is configured and ready"
npm run start-backend 2>&1 | grep -i whatsapp
```

#### 5. Scheduler Alert Test (Without WhatsApp)

```bash
# Trigger offline check manually
curl -X POST http://localhost:5000/api/site-alerts/run-check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected in logs:**

- Email alerts sent as normal
- `WhatsApp offline alert skipped - not configured` (debug level)
- Scheduler continues without errors

#### 6. UI Tests

| Test             | Steps                             | Expected                            |
|------------------|-----------------------------------|-------------------------------------|
| Profile Drawer   | Click user icon → My Profile      | Drawer opens with phone input       |
| Save Profile     | Edit phone → Save                 | Success message, persists on reload |
| Alert Dialog     | Alerts → Add Config → Phone field | Autocomplete phone input visible    |
| Phone Validation | Enter invalid phone               | Error message on save               |

---

### Testing With Meta Billing (Production)

After completing Meta billing setup:

#### 1. Configure Environment

```dotenv
WHATSAPP_ACCESS_TOKEN=your_actual_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

#### 2. Test WhatsApp Send

```bash
curl -X POST http://localhost:5000/api/site-alerts/test-whatsapp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+254712345678"}'
```

**Expected:** `{"success": true, "messageId": "wamid.XXX..."}`

#### 3. End-to-End Offline Alert

1. Configure alert for a test station with your phone number
2. Stop telemetry data from that station (or temporarily modify threshold)
3. Wait for scheduler to detect offline (3 hours by default)
4. **Receive WhatsApp message** using `bsi_site_offline_alert` template
5. Restore telemetry
6. **Receive recovery message** using `bsi_site_recovery_alert` template

---

## Troubleshooting

| Issue                                  | Cause              | Solution                                                      |
|----------------------------------------|--------------------|---------------------------------------------------------------|
| "WhatsApp not configured"              | Missing env vars   | Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN        |
| "Data truncated for column 'category'" | Invalid ENUM value | Check activity log category is AUTH/API/SLIDESHOW/CRUD/SYSTEM |
| "Invalid phone format"                 | Missing + prefix   | Use international format: +254712345678                       |
| "Failed to send WhatsApp message"      | Meta API error     | Check token validity, phone number ID, template approval      |
