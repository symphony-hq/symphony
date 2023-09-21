from typing import List
from pydantic import BaseModel
import json
import sys

class SymphonyRequest(BaseModel):
    matrix1: List[List[float]]  # The first matrix to be multiplied.
    matrix2: List[List[float]]  # The second matrix to be multiplied.

class SymphonyResponse(BaseModel):
    result: List[List[float]]  # The result of the matrix multiplication.

def handler(request: SymphonyRequest) -> SymphonyResponse:
    """
    Multiplies two matrices.
    """
    matrix1 = request.matrix1
    matrix2 = request.matrix2

    result = [[sum(a*b for a, b in zip(X_row, Y_col)) for Y_col in zip(*matrix2)] for X_row in matrix1]

    return SymphonyResponse(result=result)

if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    request = SymphonyRequest(matrix1=args['matrix1'], matrix2=args['matrix2'])
    response = handler(request)
    print(response.json())