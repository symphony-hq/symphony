import React from "react";
interface Response {
  lat: number;
  lng: number;
}
export default function Component({ props }: { props: Response }) {
  const { lat, lng } = props;
  return (
    <img
      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lng},${lat},10,0,0/400x200?access_token=pk.eyJ1IjoianJteSIsImEiOiJjazA5MXQwdngwNDZhM2lxOHFheTlieHM3In0.1Jh_NjL_Nu3YYeMUOZvmrA&attribution=false&logo=false`}
      style={{
        width: "100%",
        borderRadius: "4px",
      }}
      alt="Map showing location"
    />
  );
}
