from datetime import datetime


def lambda_handler(event, context):
    """
    Expected incoming event:
    {
      "postcode": "SW1A 1AA",
      "date": "2026-03-15",
      "time": "18:30:00"
    }
    """
    postcode = event.get("postcode", "").strip()
    date_text = event.get("date")
    time_text = event.get("time")

    # Placeholder validation and transformation.
    datetime.fromisoformat(f"{date_text}T{time_text}")

    courts = [
        {
            "facilityLocation": f"{postcode} Leisure Centre",
            "courtType": "indoor",
            "date": date_text,
            "time": time_text,
        }
    ]

    return {"courts": courts}
