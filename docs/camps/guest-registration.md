# Native guest registration

Owner decision: attendees may be guests without OfferHound accounts. Native implements its form, validation, storage and tests independently of the web application.

The backend provides two operations:

- `can_register_camp_guest(p_camp_id)` returns whether the current account is the owner or accepted admin/data_entry staff for that camp.
- `register_camp_guest` takes `p_camp_id`, `p_request_key`, `p_guest_name`, `p_actor_user_id`, `p_guest_email`, `p_jersey_number`, and `p_position_group`. It returns the guest enrollment ID. The expected staff ID must equal the authenticated caller. Optional strings may be null; position must be configured for the camp.

A guest enrollment has no user account or athlete profile. Its name and optional contact belong to that enrollment, with the registering staff recorded separately. The backend keeps ordinary account enrollment uniqueness, enforces capacity and rejects unauthorized or closed-camp registrations. Stable request keys make identical retries return the same record; a changed payload with an old key is rejected.

Native keeps the request key until success, then clears the entry for the next guest. Offline storage retains the staff ID. Entries from another account are excluded from that account's queue and never submitted. Existing legacy notes are decoded locally and keep their original operation ID. Native storage updates are serialized so concurrent offline saves do not overwrite each other.

This guest feature introduces no SQL or web source into the native repository. Historical conversion markers are documented in guest-source-audit.md. Backend schema changes belong to the independently reviewed web/backend draft. Production deployment must wait for that contract to be promoted and separate native acceptance evidence to pass.
