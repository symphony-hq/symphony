import sys
import json
from pydantic import BaseModel, Field


class SymphonyRequest(BaseModel):
    name: str = Field(description="Name of person")


class SymphonyResponse(BaseModel):
    greeting: str = Field(description="Greeting with name of person")


def handler(request: SymphonyRequest) -> SymphonyResponse:
    """
     Greet person by name
    """

    return SymphonyResponse(
        greeting='Hello {name}'.format(name=request['name']))
