# Security Specification: Creator Studio & Digital Store

This document defines the security architecture, invariants, and test payload assertions for securing our Firestore environment.

## 1. Data Invariants

1. **Root Configuration Security**: Only pre-authorized Administrators may read or write documents in `/portfolio/` and `/store/`. Regular users or guests have zero write permissions, but can read these documents if they are public catalogs.
2. **User Profiles**: A user may only read and write their own profile document under `/users/{userId}` where `userId == request.auth.uid`. No user may read another user's profile. No user may grant themselves custom purchases without an administrator.
3. **Analytics**: Regular visitors can increment views or impressions counters in `/analytics/{itemId}` but cannot arbitrary override numbers, read private totals, or delete tracking.
4. **Q&A Comments**: Users must be signed in with a verified email to write comments. They can edit or delete their own comments, but cannot modify replies written by admins. Admin responses can only be created/edited by authorized admins.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent unauthorized attempts to bypass security policies. Every single one of these must be rejected with `PERMISSION_DENIED`.

### Attack 1: User Profile Identity Spoofing
An attacker tries to create or overwrite a profile belonging to another user.
```json
{
  "path": "/users/victim_user_123",
  "action": "create",
  "auth": { "uid": "attacker_456", "token": { "email_verified": true } },
  "payload": {
    "uid": "attacker_456",
    "name": "Attacker",
    "email": "attacker@gmail.com"
  }
}
```

### Attack 2: Self-Granting Store Purchases (Privilege Escalation)
An attacker tries to insert a premium product ID directly into their own `purchases` list without payment.
```json
{
  "path": "/users/attacker_456",
  "action": "update",
  "auth": { "uid": "attacker_456", "token": { "email_verified": true } },
  "payload": {
    "purchases": ["premium-course-101", "editor-preset-pack"]
  }
}
```

### Attack 3: Unauthorized Comment Hijacking
An attacker tries to post a comment claiming to be another user.
```json
{
  "path": "/comments/malicious_comment_999",
  "action": "create",
  "auth": { "uid": "attacker_456", "token": { "email_verified": true } },
  "payload": {
    "itemId": "course-123",
    "uid": "victim_user_123",
    "userName": "Victim",
    "content": "Malicious content",
    "createdAt": "2026-07-17T09:30:14-07:00"
  }
}
```

### Attack 4: Unverified User Writing Comments
A user with an unverified email tries to create a comment.
```json
{
  "path": "/comments/unverified_comment_123",
  "action": "create",
  "auth": { "uid": "attacker_456", "token": { "email_verified": false } },
  "payload": {
    "itemId": "course-123",
    "uid": "attacker_456",
    "userName": "Attacker",
    "content": "This should be blocked",
    "createdAt": "2026-07-17T09:30:14-07:00"
  }
}
```

### Attack 5: Poisoning Analytics with Massive Counter Views
An attacker tries to manually set the view count of an item to a massive integer or negative number.
```json
{
  "path": "/analytics/preset-pack-abc",
  "action": "update",
  "auth": { "uid": "attacker_456", "token": { "email_verified": true } },
  "payload": {
    "views": 999999999
  }
}
```

### Attack 6: An Anonymous/Guest User Deleting Analytics
A guest tries to wipe out an item's analytics data.
```json
{
  "path": "/analytics/preset-pack-abc",
  "action": "delete",
  "auth": null,
  "payload": {}
}
```

### Attack 7: Regular User Modifying Global Catalog Configuration
A standard student attempts to overwrite the price of a core product.
```json
{
  "path": "/store/data",
  "action": "update",
  "auth": { "uid": "student_uid", "token": { "email_verified": true, "email": "student@gmail.com" } },
  "payload": {
    "products": []
  }
}
```

### Attack 8: Attempting to Modify immutable fields in Portfolio
A non-admin attempts to reset the portfolio schema.
```json
{
  "path": "/portfolio/data",
  "action": "create",
  "auth": { "uid": "student_uid", "token": { "email_verified": true, "email": "student@gmail.com" } },
  "payload": {
    "portfolio": []
  }
}
```

### Attack 9: Reading another User's Profile
An attacker tries to inspect a private profile.
```json
{
  "path": "/users/victim_user_123",
  "action": "get",
  "auth": { "uid": "attacker_456", "token": { "email_verified": true } },
  "payload": {}
}
```

### Attack 10: Blank comments (Vulnerability Attack)
An attacker tries to post an empty comment or a comment with content size exceeding 5000 characters.
```json
{
  "path": "/comments/blank_comment",
  "action": "create",
  "auth": { "uid": "attacker_456", "token": { "email_verified": true } },
  "payload": {
    "itemId": "course-123",
    "uid": "attacker_456",
    "userName": "Attacker",
    "content": "",
    "createdAt": "2026-07-17T09:30:14-07:00"
  }
}
```

### Attack 11: System Field Overwrite in Comments
An attacker tries to update the admin replies on a comment they did not author, or overwrite system fields.
```json
{
  "path": "/comments/comment_789",
  "action": "update",
  "auth": { "uid": "attacker_456", "token": { "email_verified": true } },
  "payload": {
    "replies": [{ "content": "I am the administrator now!" }]
  }
}
```

### Attack 12: Injecting Malformed Document ID to Poison Database
An attacker attempts to write an analytics document where the ID is 500 characters of junk to exhaust resources.
```json
{
  "path": "/analytics/malicious_very_long_id_greater_than_128_characters_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "action": "set",
  "auth": { "uid": "attacker_456", "token": { "email_verified": true } },
  "payload": {
    "impressions": 1,
    "views": 1,
    "uniqueViewers": 1,
    "revisits": 0
  }
}
```

---

## 3. Test Runner Definition

These constraints are coded inside our fortress `firestore.rules` and verified via ESLint checks. All rules are structured using the master gate and isValid[Entity] helpers.
