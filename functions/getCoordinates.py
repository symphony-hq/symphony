from typing import Optional, TypedDict
import geocoder
import json


class SymphonyRequest(TypedDict):
    address: str


class SymphonyResponse(TypedDict):
    lat: float
    lng: float


def handler(request: SymphonyRequest) -> SymphonyResponse:
    address = request["address"]

    g = geocoder.ip(address)
    lat, lng = g.latlng

    return {
        "lat": lat,
        "lng": lng
    }


if __name__ == "__main__":
    request = {"address": "me"}
    response = handler("me")
    print(json.dumps(response))
