# Metadata Scoping Fix - 2026-06-13

## Project
VarSys-Store

## What was done
Audit and fix of all Appwrite `databases.createDocument` and `databases.updateDocument` calls to include the 4 required metadata fields: `user_id`, `team_id`, `team_name`, `member`.

## Why
Without these fields, documents have NULL values for team scoping, breaking row security queries and polluting scoped lists across all VarSys-Store collections.

## Files modified in this project

- `src/tabs/AppManagementTab.tsx` — added metadata to app management document operations
- `src/pages/AdminDashboardPage.tsx` — added metadata to admin dashboard document operations

## Pattern applied
For each create/update call, the following fields are now injected:
- `user_id`: The authenticated user's ID (`user.$id` from `useAuth()` or `''`)
- `team_id`: The active team ID (`teamData?.$id` or `getUserTeamId()` or `''`)
- `team_name`: The active team name (`teamData?.name` or `''`)
- `member`: The selected member context or `''`

## Verification
- All Appwrite writes now include the 4 metadata fields
- No existing business logic was modified
- Empty string defaults used where auth/team context is unavailable

## Agent
VaSys Worker
