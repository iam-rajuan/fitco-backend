# Report API Demo (Postman)

Base URL: `http://localhost:5000`

## 1) Login as user and get access token

- Method: `POST`
- URL: `/api/v1/auth/login`
- Body (JSON):

```json
{
  "email": "user@example.com",
  "password": "User@1234"
}
```

Copy `accessToken` from response.

## 2) Submit report from user app

- Method: `POST`
- URL: `/api/v1/reports`
- Headers:
  - `Authorization: Bearer <USER_ACCESS_TOKEN>`
  - `Content-Type: application/json`
- Body (JSON):

```json
{
  "issueType": "payment_issue",
  "description": "Payment succeeded but premium features are still locked on my account.",
  "name": "John Smith",
  "email": "john.smith@email.com"
}
```

Allowed `issueType` values:
- `app_not_working`
- `payment_issue`
- `chat_problem`
- `barcode_scan_issue`
- `subscription_issue`
- `other`

## 3) Login as admin

- Method: `POST`
- URL: `/api/v1/auth/admin/login`
- Body (JSON):

```json
{
  "email": "admin@example.com",
  "password": "Admin@1234"
}
```

Copy `accessToken` from response.

## 4) View reports in admin dashboard / API

- Method: `GET`
- URL: `/api/v1/reports`
- Headers:
  - `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`

You will see `issueType`, `description`, `contactName`, `contactEmail`, and `status`.

## 5) Admin actions from report

Warn:
- `POST /api/v1/reports/actions/warn`

Disable user:
- `POST /api/v1/reports/actions/disable`

Restore access:
- `POST /api/v1/reports/actions/unblock`

Body for actions:

```json
{
  "reportId": "<REPORT_ID>",
  "userId": "<USER_ID>"
}
```
