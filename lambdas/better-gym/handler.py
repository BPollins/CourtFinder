import asyncio
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from urllib.parse import quote_plus, urlparse

import requests
from bs4 import BeautifulSoup


BETTER_BASE_URL = "https://better-admin.org.uk/api/activities"
REQUEST_TIMEOUT_SECONDS = 20
ACTIVITY_FINDER_TIMEOUT_SECONDS = 10
ACTIVITY_FINDER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


class CentresLookupError(Exception):
    pass


def _slug_from_bookings_location_href(href):
    parsed = urlparse(href)
    if parsed.netloc.lower() != "bookings.better.org.uk":
        return None
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) >= 2 and parts[0].lower() == "location":
        return parts[1]
    return None


def _anchor_activity_finder_rank(a):
    for key in (
        "data-data-layer--location-interaction-search-results-position-value",
        "data-data-layer--location-selected-search-results-position-value",
    ):
        raw = a.get(key)
        if raw is None or not str(raw).strip():
            continue
        try:
            return int(str(raw).strip())
        except ValueError:
            continue
    return None


def _slug_from_leisure_centre_href(href):
    if not href or "/leisure-centre/" not in href:
        return None
    parsed = urlparse(href)
    if "better.org.uk" not in parsed.netloc.lower():
        return None
    slug = parsed.path.rstrip("/").split("/")[-1]
    return slug or None


def _parse_activity_finder_slugs(html):
    soup = BeautifulSoup(html, "html.parser")
    missing_rank_floor = 1_000_000
    rows = []
    for idx, a in enumerate(soup.find_all("a", href=True)):
        href = (a.get("href") or "").strip()
        slug = _slug_from_bookings_location_href(href)
        if not slug:
            continue
        rank = _anchor_activity_finder_rank(a)
        sort_key = rank if rank is not None else missing_rank_floor + idx
        rows.append((sort_key, idx, slug))

    rows.sort(key=lambda t: (t[0], t[1]))
    ordered = []
    seen = set()
    for _, _, slug in rows:
        if slug not in seen:
            seen.add(slug)
            ordered.append(slug)
            if len(ordered) >= 6:
                return ordered

    return ordered


def _fetch_activity_finder_html(postcode):
    encoded = quote_plus(postcode.strip())
    url = f"https://www.better.org.uk/activity-finder?activity=Badminton&postcode={encoded}"
    headers = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "user-agent": ACTIVITY_FINDER_USER_AGENT,
    }
    response = requests.get(url, headers=headers, timeout=ACTIVITY_FINDER_TIMEOUT_SECONDS)
    response.raise_for_status()
    return response.text


async def get_centres_near_postcode(postcode: str) -> list[str]:
    def _run():
        html = _fetch_activity_finder_html(postcode)
        return _parse_activity_finder_slugs(html)

    try:
        slugs = await asyncio.to_thread(_run)
    except requests.RequestException as e:
        raise CentresLookupError(f"Activity finder request failed: {e}") from e

    if not slugs:
        raise CentresLookupError("No venue slugs parsed from activity finder HTML.")
    return slugs


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
        f"{BETTER_BASE_URL}/venue/{centre_slug}/activity/{activity_slug}/v2/times?date={date_text}"
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


BOOKING_BASE_URL = "https://bookings.better.org.uk"


def _build_booking_url(centre_slug, activity_slug, date_text, start_24h, end_24h):
    """Construct direct booking URL for a slot."""
    return (
        f"{BOOKING_BASE_URL}/location/{centre_slug}/{activity_slug}/{date_text}/by-time/slot/{start_24h}-{end_24h}"
    )


def _fetch_centre_times(session, centre_slug, booking_type, date_text):
    endpoint = _build_endpoint(centre_slug, booking_type, date_text)
    headers = _build_request_headers(centre_slug, booking_type, date_text)
    response = session.get(endpoint, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return _extract_slots(response.json())


def _is_api_gateway_event(event):
    if not isinstance(event, dict):
        return False
    return "requestContext" in event or "httpMethod" in event or "version" in event


def _api_response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(payload),
    }


def _extract_input_payload(event):
    if not _is_api_gateway_event(event):
        return event if isinstance(event, dict) else {}

    body = event.get("body")
    if isinstance(body, str) and body.strip():
        parsed = json.loads(body)
        return parsed if isinstance(parsed, dict) else {}
    if isinstance(body, dict):
        return body

    params = event.get("queryStringParameters")
    if isinstance(params, dict):
        return params
    return {}


def _build_courts(payload, centres):
    date_text = payload.get("date")
    time_text = payload.get("time")
    booking_type = _normalise_booking_type(payload.get("bookingType"))

    request_time_hhmm = datetime.strptime(time_text, "%H:%M:%S").strftime("%H:%M")
    request_minutes = _minutes_since_midnight(request_time_hhmm)
    minimum_minutes = request_minutes - 120
    maximum_minutes = request_minutes + 120

    courts = []
    with requests.Session() as session:
        with ThreadPoolExecutor(max_workers=len(centres)) as executor:
            futures = [
                executor.submit(
                    _fetch_centre_courts,
                    session,
                    centre_slug,
                    booking_type,
                    date_text,
                    minimum_minutes,
                    maximum_minutes,
                )
                for centre_slug in centres
            ]
            for future in as_completed(futures):
                courts.extend(future.result())
    return courts


def _fetch_centre_courts(session, centre_slug, booking_type, date_text, minimum_minutes, maximum_minutes):
    try:
        slots = _fetch_centre_times(session, centre_slug, booking_type, date_text)
    except requests.RequestException as e:
        # Continue other centres even if one centre fails.
        print(f"Error fetching centre times for {centre_slug}: {e}")
        return []

    centre_courts = []
    for slot in slots:
        action = slot.get("action_to_show") or {}
        if action.get("status") != "BOOK":
            continue

        start_24h = ((slot.get("starts_at") or {}).get("format_24_hour") or "").strip()
        if not start_24h:
            continue

        end_24h = ((slot.get("ends_at") or {}).get("format_24_hour") or "").strip() or start_24h
        slot_date = slot.get("date") or date_text
        activity_slug = f"badminton-{booking_type}"

        slot_minutes = _minutes_since_midnight(start_24h)
        if slot_minutes < minimum_minutes or slot_minutes > maximum_minutes:
            continue

        centre_courts.append(
            {
                "facilityLocation": centre_slug,
                "bookingType": booking_type,
                "date": slot_date,
                "time": f"{start_24h}:00",
                "price": ((slot.get("price") or {}).get("formatted_amount") or ""),
                "url": _build_booking_url(centre_slug, activity_slug, slot_date, start_24h, end_24h),
            }
        )
    return centre_courts


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
    postcode = ""
    try:
        payload = _extract_input_payload(event)
        postcode = (payload.get("postcode") or "").strip()
        if not postcode:
            raise ValueError("postcode is required.")
        centres = asyncio.run(get_centres_near_postcode(postcode))
        courts = _build_courts(payload, centres)
        return _api_response(200, {"courts": courts})
    except CentresLookupError:
        return _api_response(
            400,
            {
                "error": (
                    f"No badminton centres found near postcode {postcode} — "
                    "please try a different postcode."
                )
            },
        )
    except (ValueError, TypeError, json.JSONDecodeError) as ex:
        return _api_response(400, {"error": str(ex)})
