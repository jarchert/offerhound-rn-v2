# Camp registrant profile requirements

Pre-registration and guest walk-ups require a full name, JPG/PNG headshot (5 MB maximum), date of birth, telephone and email. Display the headshot, calendar age, telephone and email in the camp staff roster and selected evaluation. Never substitute a blank avatar for the required uploaded headshot. Guests do not need an OfferHound account.

Native implementation uses register_camp_attendee with p_camp_id, p_request_key, p_full_name, p_email, p_phone, p_date_of_birth, p_headshot_path and p_guest. Guest-specific fields: p_jersey_number, p_position_group. Optional self-registration fields: p_notes, p_referrer_url. Legacy profile completion uses p_existing_enrollment_id, restricted to the registrant or registration staff. The server enforces completeness on every new enrollment; retry keys and identical data retain the original enrollment.

The private camp-registrant-headshots bucket uses camp/actor/request.jpg or .png. The private camp_registrant_profiles table is associated by enrollment_id. Only the registrant, camp owner and accepted evaluator/registration staff may read completed profiles. Signed photo URLs last 90 seconds. The native view refreshes them before expiry. Date of birth is used to calculate age; contact details are not added to public athlete pages or leaderboards.

Legacy enrollments are retained and explicitly marked incomplete until their real details are supplied. Old incomplete offline registrations remain pending rather than being silently registered without a photo. Upload the required headshot while connected before saving a registration offline.

Web source and backend migrations remain in the separate web repository. This document records the API requirements only. Native tests do not certify web, and web tests do not certify native.
