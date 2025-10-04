import React, { useState } from "react";
import DeckGL from "@deck.gl/react";
import { ArcLayer } from "@deck.gl/layers";
import maplibregl from "maplibre-gl";
import { Map } from "react-map-gl";

export default function App() {
  const [location, setLocation] = useState("");
  const [origin, setOrigin] = useState(null);
  const [antipode, setAntipode] = useState(null);

  // Compute antipode
  function computeAntipode(lat, lng) {
    let antLat = -lat;
    let antLng = (lng + 180) % 360;
    if (antLng > 180) antLng -= 360;
    return { lat: antLat, lng: antLng };
  }

  // Fetch location using OpenStreetMap Nominatim (free)
  async function handleSearch() {
    if (!location) return;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        location
      )}`,
      { headers: { "User-Agent": "Antipode-MapLibre-App" } }
    );
    const data = await res.json();
    if (!data || data.length === 0) {
      alert("Location not found");
      return;
    }
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    const ant = computeAntipode(lat, lng);
    setOrigin({ lat, lng });
    setAntipode(ant);
  }

  const arcs = origin && antipode ? [
    {
      sourcePosition: [origin.lng, origin.lat],
      targetPosition: [antipode.lng, antipode.lat],
      getSourceColor: [0, 200, 255],
      getTargetColor: [255, 0, 128],
      getWidth: 4
    }
  ] : [];

  return (
    <div className="w-full h-full relative">
      <DeckGL
        initialViewState={{
          longitude: 0,
          latitude: 0,
          zoom: 1.5,
          pitch: 0,
          bearing: 0
        }}
        controller={true}
        layers={[new ArcLayer({ id: "arc-layer", data: arcs })]}
      >
        <Map
          reuseMaps
          mapLib={maplibregl}
          mapStyle="https://demotiles.maplibre.org/style.json"
        />
      </DeckGL>

      <div className="absolute top-4 left-4 flex flex-col gap-2 z-50">
        <input
          className="p-2 border rounded"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter location"
        />
        <button
          className="p-2 bg-blue-600 text-white rounded"
          onClick={handleSearch}
        >
          Find Antipode
        </button>
      </div>
    </div>
  );
}
