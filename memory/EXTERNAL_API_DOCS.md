# Labyrinth External API Documentation

## Overview

The Labyrinth External API provides endpoints for CRM systems to integrate with the Labyrinth OS. This enables:
- Deal management with stage-gate validation
- Lead tracking with auto-created communication threads
- Task management with SLA monitoring
- Partner/affiliate tracking with commission calculations
- Real-time webhook notifications

## Base URL

```
https://crmelevate.preview.emergentagent.com
```

## Authentication

All requests require an API key in the header:

```
X-API-Key: elk_f531ebe4a7d24c8fbcde123456789abc
```

---

## Endpoints

### Deals

#### Create Deal
```http
POST /api/external/deals
```

**Request Body:**
```json
{
  "name": "Acme Corp - Tax Services",
  "value": 500000,
  "stage": "discovery",
  "lead_id": "lead_abc123",
  "owner_id": "user_xyz789",
  "partner_id": "partner_123",
  "created_at": "2025-01-10T12:00:00Z",
  "metadata": {}
}
```

**Fields:**
- `name` (required): Deal name
- `value` (required): Deal value in **cents** (e.g., 500000 = $5,000.00)
- `stage`: One of: `discovery`, `qualification`, `proposal`, `negotiation`, `closed_won`, `closed_lost`
- `lead_id`: Associated lead ID
- `owner_id`: Sales rep user ID
- `partner_id`: Referral partner ID for commission tracking
- `metadata`: Custom key-value data

**Response:** `200 OK` with created deal object

---

#### Get Deal
```http
GET /api/external/deals/{deal_id}
```

**Response:**
```json
{
  "id": "deal_abc123",
  "name": "Acme Corp - Tax Services",
  "value": 500000,
  "stage": "discovery",
  "status": "open",
  "lead_id": "lead_abc123",
  "owner_id": "user_xyz789",
  "contract_id": null,
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z"
}
```

---

#### Update Deal
```http
PATCH /api/external/deals/{deal_id}
```

**Request Body (partial update):**
```json
{
  "stage": "qualification",
  "value": 600000
}
```

**For closing deals:**
```json
{
  "status": "won"
}
```
or
```json
{
  "status": "lost",
  "close_reason": "Budget constraints"
}
```

**Note:** When status is set to "won", Labyrinth automatically:
1. Creates a Contract in the Contract Lifecycle
2. Sends `contract.created` webhook to CRM

---

#### Validate Stage Change
```http
GET /api/external/deals/{deal_id}/validate-stage?next_stage={stage}
```

**Use this BEFORE updating stage** to check if the transition is allowed.

**Response (allowed):**
```json
{
  "allowed": true,
  "message": "Deal can move to proposal",
  "missing_requirements": [],
  "current_stage": "qualification",
  "requested_stage": "proposal"
}
```

**Response (blocked):**
```json
{
  "allowed": false,
  "message": "Cannot move to proposal. Missing requirements.",
  "missing_requirements": [
    "Qualification Document Uploaded",
    "Proposal Created"
  ],
  "current_stage": "qualification",
  "requested_stage": "proposal"
}
```

---

### Leads

#### Create Lead
```http
POST /api/external/leads
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john@acmecorp.com",
  "company": "Acme Corp",
  "phone": "+1-555-0100",
  "source": "website",
  "tier": "bronze",
  "status": "new",
  "owner_id": "user_xyz789"
}
```

**Fields:**
- `name` (required): Contact name
- `email` (required): Contact email
- `company`: Company name
- `phone`: Phone number
- `source`: Lead source (e.g., "website", "referral", "event", "api")
- `tier`: One of: `bronze`, `silver`, `gold`, `platinum`
- `status`: One of: `new`, `contacted`, `qualified`, `unqualified`

**Note:** Creating a lead automatically creates a Communication Thread in Labyrinth.

---

#### Update Lead
```http
PATCH /api/external/leads/{lead_id}
```

**Request Body:**
```json
{
  "status": "qualified",
  "tier": "gold"
}
```

**Note:** When status changes to "qualified", Labyrinth sends `lead.qualified` webhook.

---

### Tasks

#### Create Task
```http
POST /api/external/tasks
```

**Request Body:**
```json
{
  "title": "Follow up with client",
  "description": "Discuss proposal details",
  "deal_id": "deal_123",
  "lead_id": null,
  "owner_id": "user_xyz789",
  "due_date": "2025-01-15T17:00:00Z",
  "priority": "high"
}
```

**Fields:**
- `title` (required): Task title
- `description`: Task description
- `deal_id`: Associated deal
- `lead_id`: Associated lead
- `owner_id`: Task owner
- `due_date`: ISO 8601 datetime
- `priority`: One of: `low`, `medium`, `high`, `urgent`

---

#### Update Task
```http
PATCH /api/external/tasks/{task_id}
```

**Request Body:**
```json
{
  "status": "completed"
}
```

**Status values:** `pending`, `in_progress`, `completed`, `cancelled`

**Note:** 
- When status changes to "completed", Labyrinth sends `task.completed` webhook
- When due_date passes without completion, Labyrinth sends `sla.breach` webhook

---

#### Get Deal Tasks
```http
GET /api/external/deals/{deal_id}/tasks
```

Returns all tasks associated with a deal.

---

### Partners (Affiliates)

#### Create Partner
```http
POST /api/external/partners
```

**Request Body:**
```json
{
  "name": "Partner Company",
  "email": "partner@company.com",
  "company": "Partner Company Inc",
  "commission_rate": 15.0,
  "tier": "gold"
}
```

**Fields:**
- `name` (required): Partner name
- `email` (required): Partner email
- `company`: Company name
- `commission_rate`: Commission percentage (default: 10%)
- `tier`: Partner tier (default: "bronze")

**Response includes generated referral_code**

---

#### Get Partner
```http
GET /api/external/partners/{partner_id}
```

---

#### List Partners
```http
GET /api/external/partners
```

---

### KPIs

#### Get KPIs
```http
GET /api/external/kpis
```

**Response:**
```json
[
  {"name": "Total Pipeline", "value": 750000.0, "unit": "$", "trend": "up"},
  {"name": "Closed Won", "value": 125000.0, "unit": "$", "trend": "up"},
  {"name": "Conversion Rate", "value": 33.3, "unit": "%", "trend": "stable"},
  {"name": "Active Deals", "value": 5, "trend": "up"},
  {"name": "Qualified Leads", "value": 12, "trend": "up"},
  {"name": "Overdue Tasks", "value": 2, "trend": "down"}
]
```

---

### Pipeline

#### Get Pipeline Stats
```http
GET /api/external/pipeline
```

**Response:**
```json
{
  "stages": [
    {"stage": "discovery", "display_name": "Discovery", "count": 3, "total_value": 150000, "color": "#64748B"},
    {"stage": "qualification", "display_name": "Qualification", "count": 2, "total_value": 200000, "color": "#3B82F6"},
    {"stage": "proposal", "display_name": "Proposal", "count": 1, "total_value": 75000, "color": "#F59E0B"},
    {"stage": "negotiation", "display_name": "Negotiation", "count": 2, "total_value": 300000, "color": "#8B5CF6"},
    {"stage": "closed_won", "display_name": "Closed Won", "count": 3, "total_value": 125000, "color": "#22C55E"},
    {"stage": "closed_lost", "display_name": "Closed Lost", "count": 1, "total_value": 50000, "color": "#EF4444"}
  ],
  "total_deals": 12,
  "total_value": 900000,
  "avg_deal_size": 75000,
  "conversion_rate": 75.0
}
```

---

## Webhooks

### Register Webhook
```http
POST /api/external/webhooks/register?url={webhook_url}&events=sla.breach,contract.created
```

**Events:**
- `sla.breach` - Task is overdue
- `contract.created` - Contract auto-created from won deal
- `task.completed` - Task was completed
- `lead.qualified` - Lead status changed to qualified

**Response:**
```json
{
  "message": "Webhook registered",
  "url": "https://crm.example.com/webhooks/labyrinth",
  "events": ["sla.breach", "contract.created"],
  "signature_header": "X-Labyrinth-Signature",
  "note": "Use HMAC-SHA256 with provided secret to verify signatures"
}
```

---

### Webhook Payload Format

All webhooks include:
- Header: `X-Labyrinth-Signature` (HMAC-SHA256)
- Header: `X-Labyrinth-Event` (event type)
- Header: `Content-Type: application/json`

**SLA Breach:**
```json
{
  "type": "sla.breach",
  "data": {
    "deal_id": "deal_123",
    "task_id": "task_456",
    "breach_type": "overdue",
    "owner_id": "user_xyz789",
    "task_title": "Follow up call",
    "due_date": "2025-01-10T17:00:00Z"
  },
  "timestamp": "2025-01-10T18:30:00Z"
}
```

**Contract Created:**
```json
{
  "type": "contract.created",
  "data": {
    "deal_id": "deal_123",
    "contract_id": "contract_789",
    "contract_url": "/contracts/contract_789"
  },
  "timestamp": "2025-01-10T15:30:00Z"
}
```

**Task Completed:**
```json
{
  "type": "task.completed",
  "data": {
    "task_id": "task_456",
    "deal_id": "deal_123",
    "completed_at": "2025-01-10T15:30:00Z"
  },
  "timestamp": "2025-01-10T15:30:00Z"
}
```

**Lead Qualified:**
```json
{
  "type": "lead.qualified",
  "data": {
    "lead_id": "lead_abc123",
    "qualified_at": "2025-01-10T15:30:00Z"
  },
  "timestamp": "2025-01-10T15:30:00Z"
}
```

---

## Stage-Gate Requirements

Deals must complete certain tasks before advancing stages:

| Current Stage | Next Stage | Required Tasks |
|--------------|------------|----------------|
| Discovery | Qualification | - |
| Qualification | Proposal | Discovery call completed, Budget confirmed |
| Proposal | Negotiation | Qualification document uploaded, Proposal created |
| Negotiation | Closed Won | Proposal sent, Stakeholder approval |
| Closed Won | - | Contract signed, Payment terms agreed |

Tasks are matched by keywords in the title (e.g., "Discovery call with Acme" satisfies "discovery_call_completed").

---

## Error Responses

**401 Unauthorized:**
```json
{"detail": "Missing API key. Include X-API-Key header."}
```

**404 Not Found:**
```json
{"detail": "Deal not found"}
```

**400 Bad Request (Stage Validation):**
```json
{
  "detail": {
    "message": "Cannot move to proposal. Missing requirements.",
    "missing_requirements": ["Qualification Document Uploaded"]
  }
}
```

---

## Testing

### Seed Demo Data
```http
POST /api/external/seed-demo
X-API-Key: elk_f531ebe4a7d24c8fbcde123456789abc
```

Creates sample deals, leads, tasks, and partners for testing.

### Test API Key
```bash
curl -H "X-API-Key: elk_f531ebe4a7d24c8fbcde123456789abc" \
  https://crmelevate.preview.emergentagent.com/api/external/kpis
```

---

## Rate Limits

- 100 requests per minute per API key
- Webhook delivery: 3 retry attempts with exponential backoff

---

## Support

For API support, contact the Labyrinth team or open an issue in the repository.
