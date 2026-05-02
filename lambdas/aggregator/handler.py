import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from botocore.config import Config


_BOTO_CONFIG = Config(
    retries={"max_attempts": 1, "mode": "standard"},
    read_timeout=25,
    connect_timeout=5,
)
_LAMBDA_CLIENT = boto3.client("lambda", config=_BOTO_CONFIG)

PROVIDER_FUNCTIONS_ENV = "PROVIDER_FUNCTIONS"


def _parse_provider_functions(raw_value):
    providers = []
    for entry in (raw_value or "").split(","):
        entry = entry.strip()
        if not entry or "=" not in entry:
            continue
        name, function_name = entry.split("=", 1)
        name = name.strip()
        function_name = function_name.strip()
        if name and function_name:
            providers.append((name, function_name))
    return providers


def _is_api_gateway_event(event):
    if not isinstance(event, dict):
        return False
    return (
        "requestContext" in event
        or "httpMethod" in event
        or "version" in event
    )


def _is_options_request(event):
    if not _is_api_gateway_event(event):
        return False
    request_context = event.get("requestContext") or {}
    http_context = request_context.get("http") or {}
    method = http_context.get("method") or event.get("httpMethod") or ""
    return method.upper() == "OPTIONS"


def _api_response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "content-type",
            "access-control-allow-methods": "POST,OPTIONS",
        },
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


def _validate_payload(payload):
    required_fields = ("date", "time", "bookingType")
    missing = [field for field in required_fields if not payload.get(field)]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}.")


def _unwrap_provider_payload(raw_bytes):
    if not raw_bytes:
        return {}
    parsed = json.loads(raw_bytes)
    if not isinstance(parsed, dict):
        return {}
    body = parsed.get("body")
    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {}
    if isinstance(body, dict):
        return body
    return parsed


def _invoke_provider(provider_name, function_name, request_payload):
    response = _LAMBDA_CLIENT.invoke(
        FunctionName=function_name,
        InvocationType="RequestResponse",
        Payload=json.dumps(request_payload).encode("utf-8"),
    )

    if response.get("FunctionError"):
        error_text = response["Payload"].read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{provider_name} returned FunctionError: {error_text}")

    body = _unwrap_provider_payload(response["Payload"].read())
    courts = body.get("courts") if isinstance(body, dict) else None
    if not isinstance(courts, list):
        return []

    enriched = []
    for court in courts:
        if not isinstance(court, dict):
            continue
        enriched.append(
            {
                "provider": provider_name,
                "facilityLocation": court.get("facilityLocation", ""),
                "bookingType": court.get("bookingType", ""),
                "date": court.get("date", ""),
                "time": court.get("time", ""),
                "price": court.get("price", ""),
                "bookingUrl": court.get("url") or court.get("bookingUrl", ""),
            }
        )
    return enriched


def _fan_out_to_providers(providers, request_payload):
    courts = []
    errors = []

    with ThreadPoolExecutor(max_workers=max(len(providers), 1)) as executor:
        future_to_name = {
            executor.submit(_invoke_provider, name, function_name, request_payload): name
            for name, function_name in providers
        }
        for future in as_completed(future_to_name):
            provider_name = future_to_name[future]
            try:
                courts.extend(future.result())
            except Exception as exc:
                # One bad provider must not take down the whole response.
                print(f"Provider '{provider_name}' invocation failed: {exc}")
                errors.append({"provider": provider_name, "error": str(exc)})

    return courts, errors


def lambda_handler(event, _context):
    """
    Expected incoming payload (direct invoke or API Gateway / Function URL body):
    {
      "postcode": "N1 2AA",
      "date": "2026-02-24",
      "time": "14:00:00",
      "bookingType": "60min"
    }
    """
    if _is_options_request(event):
        return _api_response(200, {})

    try:
        payload = _extract_input_payload(event)
        _validate_payload(payload)

        providers = _parse_provider_functions(os.environ.get(PROVIDER_FUNCTIONS_ENV))
        if not providers:
            return _api_response(
                500,
                {"error": f"{PROVIDER_FUNCTIONS_ENV} env var is not configured."},
            )

        courts, errors = _fan_out_to_providers(providers, payload)
        return _api_response(200, {"courts": courts, "errors": errors})
    except (ValueError, TypeError, json.JSONDecodeError) as e:
        return _api_response(400, {"error": str(e)})
