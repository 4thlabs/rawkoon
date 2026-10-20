# Delete media requests

## Why

The requests list only grows. Two moments need a way out:

- **An admin clearing denied requests.** Denied requests stay in the "All" list on web and iOS forever, and on RawkoonTV they sit in the requester's "My requests" home row.
- **A requester taking a request back.** They asked for the wrong title, or changed their mind, and today only an admin can make the request go away (by denying it).

There is also a dead end on RawkoonTV: `TitleState.canRequest` is true only for `Requestable`, so a title with a denied request shows `Refused` and can never be requested again from the TV, even though the API reopens denied requests. Deleting the denied request clears that state.

## Goals

- A requester can withdraw their own pending request and dismiss their own denied request.
- An admin can delete any pending or denied request.
- Deleting a request makes the title requestable again on every client.
- Web, iOS and RawkoonTV all expose the action.

## Non-goals

- Deleting approved or available requests.
- Automatic cleanup of old or fulfilled requests (parked).
- A withdraw button on the web or iOS title pages (parked).
- Soft delete, archive, or an audit trail of deleted requests.

## Anti-goals

- A delete that removes or changes anything in the library, a grab, or a download. This deletes the request row and nothing else.
- Revealing that someone else's request exists to a non-admin through the delete endpoint's responses.

## Rules (decided)

| Request status | Requester (own requests) | Admin (any request) |
|---|---|---|
| pending | withdraw | delete |
| denied | dismiss | delete |
| approved | not allowed | not allowed |
| available | not allowed | not allowed |

- The delete is a hard delete of the `MediaRequest` row. Because requests are unique per title (`@@unique([tmdbId, type])`, `@@unique([googleVolumeId])`), removing the row is what makes the title requestable again.
- Approved and available requests are locked: they record who asked for a title that is in, or on its way into, the library. *(Claude's call, accepted.)*

## API

`DELETE /api/requests/:id`, under the router's existing `requireUser` guard (not `requireAdmin`; the permission check lives in the service).

Service function in `services/mediaRequests.ts`, next to `approveRequest` / `denyRequest`, returning a result union in the same style:

- Not found → `not_found` → **404**.
- Caller is not an admin and not the requester → also `not_found` → **404**, so a non-admin can't probe for other people's requests. *(Claude's call, accepted.)*
- Status is `approved` or `available` → **400** ("Request can't be deleted").
- Otherwise delete the row → **200** `{ ok: true }`.

The status check and the delete must not race an approval: delete only where the status is still `pending` or `denied` (for example `deleteMany({ where: { id, status: { in: [...] } } })` and treat a zero count as a re-read), so a request approved a moment earlier is not deleted.

Approve and deny already return 404 for a missing id. That path is now an expected outcome: the requester withdrew it while an admin was looking at it.

Add the endpoint to the shared request types / endpoint constants so web uses it the way it uses `APPROVE` and `DENY`.

## Clients

Shared across all three clients:

- **Labels follow the action:** "Withdraw" on your own pending request, "Clear" on your own denied request (not "Dismiss": the iOS catalog already translates that as "Fermer"), "Delete" when an admin acts on someone else's request. An admin acting on their own request gets the requester label.
- **A 404 from delete, approve or deny** shows "This request was withdrawn" and refreshes the list, instead of the current generic error.
- **The action shows only on rows the rules allow.** The client decides from `status`, `requested_by.id` and the current user's admin flag; the server enforces the same rules.
- New strings are localized (web `en`/`fr` locales, iOS string catalog, TV string resources).

### Web (`apps/web/src/pages/activity/requests`)

- `RequestRow` gets a trash button on rows the caller may delete. Clicking it turns the button into an inline "Delete?" (the label for the case), and a second click deletes. No modal. The armed state resets when focus leaves or after a short timeout.
- A `useDeleteRequest` mutation alongside `useApproveRequest` / `useDenyRequest`, invalidating `queryKeys.requests.all`, and also `queryKeys.books.all` for a book request (book search and discovery show each volume's request status, as `useCreateRequest` already handles).
- Undo was considered and dropped: with a hard delete it means either delaying the real delete (lost if the tab closes) or recreating the row (new id, lost creation date).

### iOS (`apps/ios/Rawkoon/Views/RequestsView.swift`)

- A new trailing swipe action with the case's label, added beside the existing admin Approve/Deny swipe actions, full swipe still off. The deliberate swipe-then-tap is the confirmation.
- `APIClient+Activity.swift` gets `deleteRequest(id:)` next to `denyRequest`.
- On success the row animates out and the list reloads (which also refreshes the cached `Endpoints.requests` value used by `hydrateFromCache`). Offline, the action is gated with `OfflineFeedback.gate`, like Approve/Deny.

### RawkoonTV (`~/sites/rawkoon-tv`, separate repo and PR)

- On the details page (`DiscoverDetailsScreen`), a title in `Pending` or `Refused` state that belongs to this account gets a second button: "Withdraw request" for `Pending`, "Clear request" for `Refused`. Pressing it asks for confirmation (an undo toast can't be reached with a remote), then calls `DELETE api/requests/:id`, the state becomes `Requestable`, and focus moves to the Request button.
- Ownership: `/api/requests/status` returns `deny_reason` only for the caller's own requests or to admins, so it can't tell the TV whose request it is. Return a boolean such as `mine` in the status response's `request` object (true when the caller is the requester) so the TV knows when to show the button. The TV only handles the account's own requests, admins included: moderating other people's requests stays on web and iOS. (Decided.)
- The button follows the displayed state: it appears only when `TitleState.of` resolves to `Pending` or `Refused` (so a title whose library entry wins shows no button). *(Claude's call.)*
- After a successful delete, re-fetch `/api/requests/status` and show what comes back rather than forcing `Requestable` locally. *(Claude's call.)*
- The "My requests" home row needs no UI change: a deleted request drops out on its next refresh.
- An older TV build that doesn't send deletes keeps working unchanged. The new field in the status response is additive.

## Edge cases (Claude's calls)

- **Linked rows:** the delete rule looks at status only. A pending or denied request never has `libraryMediaId` / `libraryBookId` set (only approval sets them, and deny requires pending), so nothing linked is lost.
- **Existing notifications** that mention a deleted request are left alone. Their deep link opens the requests list, which simply no longer shows the row; it must not error.
- **Deny vs withdraw race:** if the deny lands first, the request is denied and the requester can still dismiss it. If the withdraw lands first, deny gets 404 and shows "This request was withdrawn".
- **Admin's own pending request** (books, since an admin's movie/show requests are approved on the spot): iOS shows Approve, Deny and Withdraw side by side in the swipe actions.

## Tests

- API: the service's permission matrix (requester vs admin vs other user × each status), the 404-for-others rule, and the approve-vs-delete race (delete doesn't remove a request that is already approved). Route test for the status codes.
- Web: `RequestsPage.test.tsx` for which rows show the button, the two-click arm, and the 404 message.
- iOS: the label/visibility decision as a small pure function, unit-tested the way `RequestRowFace` is.
- TV: `TitleState` / button-visibility logic in the existing unit test style.

## Left to the builder

- Exact copy, icons, and the timeout for the web inline confirm.
- Whether the iOS label/visibility helper lives in `RequestRowFace` or beside it.
- PR order: API first (with the shared types and the status `mine` field), then web + iOS in this repo, then RawkoonTV.

## Parking lot

- Automatically clear fulfilled (`available`) requests after a while.
- Delete a title's request when its library item is deleted, so no stale `available` rows remain.
- Long-press menu on RawkoonTV's "My requests" home row.
- Notify the admin when a requester withdraws a request.
- Withdraw button on the web and iOS title pages.
