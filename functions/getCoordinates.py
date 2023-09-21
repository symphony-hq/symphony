from typing import Optional, TypedDict
import geocoder
import json
import sys
from pydantic import BaseModel


class SymphonyRequest(BaseModel):
    address: str  # The IP address to get the coordinates of. Defaults to 'me'.


class SymphonyResponse(BaseModel):
    lat: float
    lng: float


def handler(request: SymphonyRequest) -> SymphonyResponse:
    """
    Returns the latitude and longitude of the given IP address.
    """
    address = request.address

    g = geocoder.ip(address)
    lat, lng = g.latlng

    return SymphonyResponse(lat=lat, lng=lng)


if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    request = SymphonyRequest(**args)
    response = handler(request)
    print(response.json())
