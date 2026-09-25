# AdmitRoute Change Reports

A change report is created when a monitored official source differs
from its previous snapshot.

Each report should contain:

- University ID
- University name
- Source URL
- Source type
- Detection timestamp
- Previous snapshot reference
- Current snapshot reference
- Previous content hash
- Current content hash
- Change status
- Review status
- Evidence reference
- Admin verification details

Possible review states:

- pending
- verified
- rejected

Important:

A change report does NOT automatically update public university data.

Public data can only change after admin verification and approval.
