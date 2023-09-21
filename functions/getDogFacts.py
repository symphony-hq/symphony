import requests
import json
import sys
from pydantic import Field, BaseModel


class SymphonyRequest(BaseModel):
    pass


class SymphonyResponse(BaseModel):
    facts: list = Field(description="A list of dog facts")


def handler(request: SymphonyRequest) -> SymphonyResponse:
    """
    Get dog facts
    """
    response = requests.get('https://dog-api.kinduff.com/api/facts')
    data = response.json()

    return SymphonyResponse(facts=data['facts'])


if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    request = SymphonyRequest(**args)
    response = handler(request)
    print(response.json())
