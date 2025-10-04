import React, { useState, useRef, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { ArcLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import maplibregl from "maplibre-gl";

const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

export default function App() {
  const [location, setLocation] = useState("");
  const [origin, setOrigin] = useState(null);
  const [antipode, setAntipode] = useState(null);

  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  // Create MapLibre map only once
  useEffect(() => {
    if (mapContainer.current && !mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: [0, 0],
        zoom: 1.5
      });
    }
  }, []);

  // Compute antipode
  function computeAntipode(lat, lng) {
    let antLat = -lat;
    let antLng = (lng + 180) % 360;
    if (antLng > 180) antLng -= 360;
    return { lat: antLat, lng: antLng };
  }

  // Search location
  async function handleSearch() {
    if (!location) return;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`,
      { headers: { "User-Agent": "Antipode-MapLibre-App" } }
    );
    const data = await res.json();
    if (!data || data.length === 0) {
      alert("Location not found");
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    const displayName = data[0].display_name;
    const ant = computeAntipode(lat, lng);

    setOrigin({ lat, lng, displayName });
    setAntipode({ ...ant, displayName: "Antipode of " + displayName });

    // Fly to origin
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 3 });
    }
  }

  // Arc between origin and antipode
  const arcs = origin && antipode ? [
    {
      sourcePosition: [origin.lng, origin.lat],
      targetPosition: [antipode.lng, antipode.lat],
      getSourceColor: [0, 200, 255],
      getTargetColor: [255, 0, 128],
      getWidth: 3
    }
  ] : [];

  // Markers for origin and antipode
  const markers = [];
  if (origin) markers.push(origin);
  if (antipode) markers.push(antipode);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="absolute w-full h-full z-0" />

      <DeckGL
        initialViewState={{
          longitude: 0,
          latitude: 0,
          zoom: 1.5,
          pitch: 0,
          bearing: 0
        }}
        controller={true}
        layers={[
          new ArcLayer({
            id: "arc-layer",
            data: arcs,
            getSourcePosition: d => d.sourcePosition,
            getTargetPosition: d => d.targetPosition,
            getSourceColor: d => d.getSourceColor,
            getTargetColor: d => d.getTargetColor,
            getWidth: d => d.getWidth,
            pickable: false,
            autoHighlight: true
          }),
          new ScatterplotLayer({
            id: "marker-layer",
            data: markers,
            getPosition: d => [d.lng, d.lat],
            getFillColor: d => [255, 140, 0],
            getRadius: d => 50000,
            pickable: true,
            radiusMinPixels: 5
          }),
          new TextLayer({
            id: "text-layer",
            data: markers,
            getPosition: d => [d.lng, d.lat],
            getText: d => d.displayName,
            getSize: 16,
            getColor: [255, 255, 255],
            getAngle: 0,
            getTextAnchor: "start",
            getAlignmentBaseline: "center"
          })
        ]}
      />

      <div className="absolute top-4 left-4 flex flex-col gap-2 z-50">
        <input
          className="p-2 border rounded"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter location (e.g., Indore, Madhya Pradesh)"
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
