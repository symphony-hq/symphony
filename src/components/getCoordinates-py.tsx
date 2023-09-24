import React from "react";
import mapboxgl from "mapbox-gl";
import { useRef, useEffect } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
mapboxgl.accessToken = "";
interface Response {
  lat: number;
  lng: number;
}
export default function Component({ props }: { props: Response }) {
  const { lat, lng } = props;
  const mapRef = useRef();
  useEffect(() => {
    if (mapRef.current) {
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: 9,
      });
      map.on("load", function () {
        map.addSource("point", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
          },
        });
        map.addLayer({
          id: "point",
          type: "circle",
          source: "point",
          paint: {
            "circle-radius": 5,
            "circle-color": "#EB55F7",
          },
        });
      });
    }
  });
  return (
    <div
      style={{ width: "100%", height: "200px", borderRadius: "4px" }}
      ref={mapRef}
    />
  );
}
