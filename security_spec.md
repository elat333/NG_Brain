# Security Specification - Novagreen AI

## Data Invariants
- A `Task` must have a valid `processId`.
- A `Project` must have a valid `processId`.
- `TeamMember` documents link to Auth users via the `uid` field.
- Roles define permissions, but for simplicity in rules, we will use a "Check if user is admin" pattern based on their `TeamMember` document's `systemRoleId`.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a `TeamMember` with a `uid` belonging to another user.
2. **Privilege Escalation**: A non-admin user tries to update their own `systemRoleId` to `role-admin`.
3. **Orphaned Task**: Create a `Task` with a non-existent `processId`.
4. **Invalid Status**: Update a `Task` status to something not in the enum (e.g., "deleted").
5. **PII Leak**: A non-authenticated user tries to read the `members` collection.
6. **Malicious ID**: Use an extremely long or invalid character string as a document ID.
7. **Shadow Field**: Adding an `isAdmin: true` field to a document where it doesn't belong.
8. **Resource Poisoning**: Sending a 1MB string into a `name` field.
9. **Cross-Member Edit**: Member A tries to edit Member B's profile details.
10. **Unauthorized Role Management**: Non-admin trying to create or edit a `Role`.
11. **Future Timestamp**: Setting `createdAt` to a future date instead of `request.time`.
12. **Bypassing Relation**: Creating a `Project` for a `Process` that doesn't exist.

## Test Runner (Simplified Plan)
The `firestore.rules.test.ts` will verify these cases by attempting illegal operations and asserting rejection.
