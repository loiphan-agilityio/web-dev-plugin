Implement this ticket.

**NOTES-12 — Notes page**

As a user I want a Notes page so I can keep short notes.

- New page at `/notes`, linked from the header.
- List my notes from `GET /notes`. Each note has `id` (number), `title` (string), `body` (string) and `createdAt` (ISO date string). Show the title and the body.
- A form on the same page creates a note with `POST /notes` (`{ title, body }`). Title is required and at most 80 characters; body is optional and at most 500 characters. Leading/trailing spaces in the title are ignored.
- After creating a note the list shows it and the form is cleared.
- If the server rejects the note (422 with field errors), show the messages next to the fields.
- Show a loading state, an empty state ("No notes yet") and an error state with a retry.
- Tests for all of the above.

Design: the approved design for this page is `design/notes.png`. Build the page to match it. Its colors are the app's brand colors.
