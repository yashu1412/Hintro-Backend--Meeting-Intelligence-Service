# Testing Documentation

This document lists the test scenarios executed, edge cases considered, and limitations discovered in the Meeting Intelligence Service.

---

## 1. Test Suite Overview

The project uses **Vitest** for running unit and integration tests.
Tests are located in the `tests/` directory:
- [auth.test.ts](file:///d:/dev/talent-IQ-master/talent-IQ-master/hintroAI/backend/tests/auth.test.ts): User registration, login, JWT token generation, conflict handling.
- [meetings.test.ts](file:///d:/dev/talent-IQ-master/talent-IQ-master/hintroAI/backend/tests/meetings.test.ts): Meeting creation, retrieval, listing with pagination, search filtering.
- [actionItems.test.ts](file:///d:/dev/talent-IQ-master/talent-IQ-master/hintroAI/backend/tests/actionItems.test.ts): Action item creation, status transition validation, overdue items detection.

### Running Tests Locally

To run all unit tests:
```bash
npm test
```

To run tests with code coverage:
```bash
npm run test:coverage
```

---

## 2. Test Scenarios Executed

### Authentication Service
- **Register New User**: Validates successful registration returning a valid JWT token and user profile.
- **Duplicate Email Conflict**: Verifies that registering with an already existing email throws a `409 CONFLICT` error.
- **Login with Valid Credentials**: Assures a correct email/password combination returns a JWT token.
- **Login with Non-existent User**: Assures that an invalid email throws a `401 UNAUTHORIZED` error.

### Meetings Service
- **Create Meeting**: Verifies that meeting creation successfully saves input parameters and correctly parses JSON serialized fields (e.g. deserializing `participants` and `transcript` columns).
- **List Meetings with Pagination**: Verifies the service returns a subset of meetings (e.g. limit/offset page tracking) along with standard pagination metadata.
- **Search Filtering**: Verifies search query parameter applies correctly in querying the database for meetings that match a partial string in the title.
- **Get Meeting by ID (Success)**: Checks retrieval of a single meeting if owned by the user.
- **Get Meeting by ID (Not Found)**: Assures requesting a non-existent or unauthorized meeting throws a `404 NOT_FOUND` error.

### Action Items Service
- **Create Action Item**: Verifies manual creation of an action item with citations is successfully saved and correctly parsed.
- **Status Transitions**:
  - Verifies that status can be updated from `PENDING` to `IN_PROGRESS`.
  - Verifies transition validation checks (e.g., status updates to a completed item cannot go back to in progress, throwing a `400 INVALID_TRANSITION` error).
  - Assures modifying action items belonging to another user throws a `404 NOT_FOUND` error.
- **Get Overdue Action Items**: Ensures the system correctly queries database for items where `dueDate` < current time and status is not `COMPLETED`.

---

## 3. Edge Cases Considered & Handled

- **JSON Deserialization**: The SQLite DB driver does not support native array/object columns, so JSON strings are parsed and serialized in the service layer. Our tests assert that these transformations behave correctly.
- **Strict Transition Rules**: Action item updates restrict backwards movement from `COMPLETED` to prevent state corruption.
- **Tenant Isolation**: All operations (`getMeetingById`, `updateActionItemStatus`, etc.) strictly enforce that the resource belongs to the currently authenticated `userId`.
- **Trace ID Injection**: Request pipeline tests/middleware ensure that every incoming request has a unique Trace ID generated if not sent by the client, and that it is present in all logs and error responses.

---

## 4. Limitations Discovered

- **Mock DB State**: Unit tests mock the Prisma service database client rather than running against an in-memory SQL database. While fast, this mock state might hide query/schema syntax bugs.
- **No Mocking of LLM API**: The `/analyze` endpoint calls the LLM provider, which is not fully covered by automated unit tests due to API key dependency and network requests. (Manual API validation is used instead).
