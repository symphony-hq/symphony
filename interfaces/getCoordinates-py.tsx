import React from "react";

interface Response {
  lat: number;
  lng: number;
}

export default function Component({ props }: { props: Response }) {
  const { lat, lng } = props;

  return (
    <img
      style={{ borderRadius: "3px", width: "100%" }}
      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lng},${lat},9,0,0/400x200?access_token=pk.eyJ1IjoianJteSIsImEiOiJjazA5MXQwdngwNDZhM2lxOHFheTlieHM3In0.1Jh_NjL_Nu3YYeMUOZvmrA&logo=false&attribution=false`}
    />
  );
}
