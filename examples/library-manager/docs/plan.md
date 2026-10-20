# Library manager

## Product
A back-office tool for librarians. They keep the book catalogue and the member list, lend copies of
books to members, record returns, and see which loans are overdue.

## Data model
Book
- id: number
- title: string, required, trimmed, at most 200 characters
- author: string, required, trimmed, at most 120 characters
- isbn: string, required, 10 or 13 digits (hyphens allowed), unique
- category: string, optional ('' when empty), at most 60 characters
- totalCopies: integer, required, 1 to 99
- availableCopies: integer, set by the server (totalCopies minus open loans)
- createdAt: ISO date-time, set by the server

Member
- id: number
- name: string, required, trimmed, at most 120 characters
- email: string, required, valid email, unique
- phone: string, optional ('' when empty), at most 30 characters
- status: "active" | "suspended", default "active"
- joinedAt: ISO date (YYYY-MM-DD), set by the server

Loan
- id: number
- bookId: number
- memberId: number
- bookTitle: string, set by the server
- memberName: string, set by the server
- borrowedAt: ISO date (YYYY-MM-DD), set by the server (today)
- dueDate: ISO date (YYYY-MM-DD), borrowedAt + 14 days unless the request gives one
- returnedAt: ISO date or null
- status: "active" | "returned" | "overdue", derived by the server: returned when returnedAt is set,
  overdue when not returned and dueDate is before today, else active

## API
All paths are under `VITE_API_URL`.

| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /books | | Book[] | |
| POST | /books | { title, author, isbn, category, totalCopies } | 201 Book | 422 { message, errors: { field: message } } |
| PATCH | /books/:id | the book form's fields | Book | 404, 422 (also totalCopies below copies on loan) |
| DELETE | /books/:id | | 204 | 404, 409 { message } when the book has active loans |
| GET | /members | | Member[] | |
| POST | /members | { name, email, phone, status } | 201 Member | 422 |
| PATCH | /members/:id | the member form's fields | Member | 404, 422 |
| DELETE | /members/:id | | 204 | 404, 409 { message } when the member has active loans |
| GET | /loans | | Loan[] | |
| POST | /loans | { bookId, memberId, dueDate? } | 201 Loan | 404 unknown book or member, 422 { message, errors } (no copies available, member suspended, bad date) |
| POST | /loans/:id/return | | Loan | 404, 409 { message } already returned |
| GET | /loans/stats | | { books, members, activeLoans, overdueLoans, dueThisWeek } | |

## Features
### LIB-1 Books page: catalogue list, filter, create, edit and delete
As a librarian I want to manage the book catalogue in one place.
- New page at /books, linked from the header as "Books". "/" redirects to /loans.
- Each row shows title, author, ISBN, category ("Uncategorised" when empty) and "available / total"
  copies. A book with no available copies shows an "Unavailable" badge.
- Search by title, author or ISBN (`?q=`) and filter by availability (`?availability=available`),
  both kept in the URL.
- An "Add book" form creates a book; the list shows it, the form clears, a "Book created" toast appears.
  422 field errors appear next to the fields.
- Each row has Edit (same form, prefilled, "Book updated" toast) and Delete (confirm dialog,
  "Book deleted" toast). A 409 on delete shows its message in an alert.
- Loading, empty ("No books yet"), no-match (with a "Clear filters" button) and error-with-retry states.

### LIB-2 Members page: list, filter, create, edit and delete
As a librarian I want to manage library members.
- New page at /members, linked from the header as "Members".
- Each row shows name, email, phone ("No phone" when empty) and a status badge (Active / Suspended).
- Search by name or email (`?q=`) and filter by status (`?status=suspended`), kept in the URL.
- An "Add member" form creates a member ("Member created" toast, 422 errors next to fields).
- Each row has Edit ("Member updated" toast) and Delete (confirm dialog, "Member deleted" toast;
  a 409 shows its message in an alert).
- Loading, empty ("No members yet"), no-match and error-with-retry states.

### LIB-3 Loans page: lend, return, see overdue
As a librarian I want to lend books, record returns and see what is overdue.
- New page at /loans, linked from the header as "Loans" (the default page).
- Each row shows book title, member name, borrowed date, due date, and a status badge
  (Active / Overdue / Returned). Overdue rows also show "N days overdue". Returned rows show the returned date.
- Filter by status tabs All / Active / Overdue / Returned (`?status=overdue`) and search by book or
  member (`?q=`), kept in the URL.
- A "Lend book" form picks a book (only those with available copies) and an active member, with an
  optional due date (default 14 days out); on success the loan appears, a "Book lent" toast shows, and
  the book's available copies drop. 422 errors appear next to the fields or in an alert.
- Active and overdue rows have a "Return" button; it records the return, shows a "Return recorded" toast
  and the row becomes Returned. A 409 shows its message.
- Loading, empty ("No loans yet"), no-match and error-with-retry states.

### LIB-4 Overview dashboard
As a librarian I want a summary of the library and its overdue loans.
- New page at /overview, linked from the header as "Overview".
- Stat cards: Books, Members, Active loans, Overdue loans, Due this week.
- Below, an "Overdue loans" table (book, member, due date, days overdue) with a Return button per row;
  "No overdue loans" when there are none. Both refresh after a lend or a return elsewhere.
- Loading and error-with-retry states.

## Mock data
8 books: one with 0 available copies, one with an empty category, one with several copies out, the rest
fully available. 6 members: 5 active, 1 suspended, one with an empty phone. 9 loans: 3 overdue (one
more than 10 days), 3 active (one due today, two due within 7 days), 3 returned (one returned late).
Dates are relative to today, so overdue stays overdue whenever the mocks run. The mock handlers keep
available copies in step with the loans and enforce the 409 and 422 rules above.

## Assumptions
- No sign-in or roles: every user is a librarian.
- A loan is for one copy of one book; the default loan period is 14 days.
- "Overdue" is computed from the server date; a loan due today is not overdue.
- Suspended members cannot borrow; returns are always allowed.
- No fines, reservations, renewals or email reminders.
- Filtering and search happen in the browser: list endpoints take no query parameters.
- Books and members with active loans cannot be deleted (409); returned loan history keeps the
  title and name captured on the loan.
- ISBN and member email uniqueness are enforced by the mock API with a 422 field error.
- The app opens on the Loans page, the librarian's daily task.
- Added while building:
  - No detail pages: edit reuses the list data, so `GET /books/:id` and `GET /members/:id` are not
    part of the API.
  - A new `ConflictError` (409) in the shared API layer carries the server's message for refused
    deletes and repeated returns.
  - "Active loans" on the Overview counts every loan not yet returned, overdue ones included;
    "Due this week" is due today through today + 7, inclusive, not returned.
  - A due date given when lending must be today or later; the date is shown as `YYYY-MM-DD`.
  - ISBNs are checked for 10 or 13 digits (hyphens allowed), not for a check digit or a trailing `X`.
  - Loans list order: open loans by due date (most overdue first), then returned loans, latest first.
  - The lend form offers only books with a copy on the shelf and members who are not suspended.
  - The fake backend keeps its data in browser memory: a page reload restores the mock data.
