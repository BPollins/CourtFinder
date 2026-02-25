import json
from handler import lambda_handler

with open("event.sample.json", "r") as f:
    event = json.load(f)

result = lambda_handler(event, None)
print(json.dumps(result, indent=2, ensure_ascii=False))