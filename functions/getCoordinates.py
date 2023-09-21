from typing import Optional, TypedDict
import geocoder
import json
import sys
from pydantic import Field, BaseModel


class SymphonyRequest(BaseModel):
    ipAddress: str = Field(
        description="The IP address; Use 'me' to get own IP address")


class SymphonyResponse(BaseModel):
    lat: float = Field(description="The latitude of IP address")
    lng: float = Field(description="The longitude of IP address")


def handler(request: SymphonyRequest) -> SymphonyResponse:
    """
    Get latitude and longitude from IP address
    """
    ipAddress = request.ipAddress

    g = geocoder.ip(ipAddress)
    lat, lng = g.latlng

    return SymphonyResponse(lat=lat, lng=lng)


if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    request = SymphonyRequest(**args)
    response = handler(request)
    print(response.json())
