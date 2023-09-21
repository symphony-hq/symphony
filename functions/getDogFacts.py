import requests
import json
import sys
from pydantic import BaseModel

class SymphonyRequest(BaseModel):
    pass  # No input required for this function

class SymphonyResponse(BaseModel):
    facts: list  # The list of dog facts

def handler(request: SymphonyRequest) -> SymphonyResponse:
    """
    Fetches dog facts from an API.
    """
    response = requests.get('https://dog-api.kinduff.com/api/facts')
    data = response.json()

    return SymphonyResponse(facts=data['facts'])

if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    request = SymphonyRequest()
    response = handler(request)
    print(response.json())