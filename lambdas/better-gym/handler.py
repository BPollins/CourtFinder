from datetime import datetime

import requests


CENTRES = [
    "talacre-community-sports-centre",
    "sobell-leisure-centre",
    "clissold-leisure-centre",
    "swiss-cottage-leisure-centre",
    "hendon-leisure-centre",
    "kings-cross-fitness",
    "barnet-copthall-leisure-centre",
]

BETTER_BASE_URL = "https://better-admin.org.uk/api/activities"
REQUEST_TIMEOUT_SECONDS = 20


def _normalise_booking_type(raw_booking_type):
    booking_type = (raw_booking_type or "").strip().lower()
    if booking_type in {"40", "40min"}:
        return "40min"
    if booking_type in {"60", "60min"}:
        return "60min"
    raise ValueError("bookingType must be either '40min' or '60min'.")


def _minutes_since_midnight(time_text):
    parsed = datetime.strptime(time_text, "%H:%M")
    return parsed.hour * 60 + parsed.minute


def _extract_slots(response_json):
    slots = response_json.get("data")
    if isinstance(slots, list):
        return slots
    return []


def _build_endpoint(centre_slug, booking_type, date_text):
    activity_slug = f"badminton-{booking_type}"
    return (
        f"{BETTER_BASE_URL}/venue/{centre_slug}/activity/"
        f"{activity_slug}/times?date={date_text}"
    )


def _build_request_headers(centre_slug, booking_type, date_text):
    activity_slug = f"badminton-{booking_type}"
    return {
        "accept": "application/json",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "origin": "https://bookings.better.org.uk",
        "priority": "u=1, i",
        "referer": (
            "https://bookings.better.org.uk/location/"
            f"{centre_slug}/{activity_slug}/{date_text}/by-time"
        ),
        "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/143.0.0.0 Safari/537.36"
        ),
    }


def _fetch_centre_times(session, centre_slug, booking_type, date_text):
    endpoint = _build_endpoint(centre_slug, booking_type, date_text)
    headers = _build_request_headers(centre_slug, booking_type, date_text)
    response = session.get(endpoint, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return _extract_slots(response.json())


def lambda_handler(event, _context):
    """
    Expected incoming event:
    {
      "postcode": "N1 2AA",
      "date": "2026-02-24",
      "time": "14:00:00",
      "bookingType": "60min"
    }
    """
    date_text = event.get("date")
    time_text = event.get("time")
    booking_type = _normalise_booking_type(event.get("bookingType"))

    request_time_hhmm = datetime.strptime(time_text, "%H:%M:%S").strftime("%H:%M")
    request_minutes = _minutes_since_midnight(request_time_hhmm)
    minimum_minutes = request_minutes - 120
    maximum_minutes = request_minutes + 120

    courts = []
    with requests.Session() as session:
        for centre_slug in CENTRES:
            try:
                slots = _fetch_centre_times(session, centre_slug, booking_type, date_text)
            except requests.RequestException as e:
                # Continue other centres even if one centre fails.
                print(f"Error fetching centre times: {e}")
                continue

            for slot in slots:
                action = slot.get("action_to_show") or {}
                if action.get("status") != "BOOK":
                    continue

                start_24h = ((slot.get("starts_at") or {}).get("format_24_hour") or "").strip()
                if not start_24h:
                    continue

                slot_minutes = _minutes_since_midnight(start_24h)
                if slot_minutes < minimum_minutes or slot_minutes > maximum_minutes:
                    continue

                courts.append(
                    {
                        "facilityLocation": centre_slug,
                        "bookingType": booking_type,
                        "date": slot.get("date") or date_text,
                        "time": f"{start_24h}:00",
                    }
                )

    return {"courts": courts}
