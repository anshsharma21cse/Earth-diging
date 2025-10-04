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

  // Initialize MapLibre map
  useEffect(() => {
    if (mapContainer.current && !mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: [0, 0],
        zoom: 1.5,
      });
    }
  }, []);

  // Click-to-correct feature
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    const handleClick = (e) => {
      const { lngLat } = e;
      const lat = lngLat.lat;
      const lng = lngLat.lng;

      const correctedOrigin = { lat, lng, displayName: "User-corrected location" };
      setOrigin(correctedOrigin);

      const ant = computeAntipode(lat, lng);
      setAntipode({ ...ant, displayName: "Antipode of corrected location" });
    };

    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [mapRef.current]);

  // Exact antipode calculation
  function computeAntipode(lat, lng) {
    let antLat = -lat;
    let antLng = lng + 180;
    if (antLng > 180) antLng -= 360; // normalize
    return { lat: antLat, lng: antLng };
  }

  // Search for location using Nominatim
  async function handleSearch() {
    if (!location) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`,
      { headers: { "User-Agent": "Accurate-Antipode-App" } }
    );

    const data = await res.json();
    if (!data || data.length === 0) {
      alert("Location not found");
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    const displayName = data[0].display_name;

    setOrigin({ lat, lng, displayName });

    const ant = computeAntipode(lat, lng);
    setAntipode({ ...ant, displayName: "Antipode of " + displayName });

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 2 });
    }
  }

  // ArcLayer (geodesic tunnel)
  const arcs = origin && antipode ? [
    {
      sourcePosition: [origin.lng, origin.lat],
      targetPosition: [antipode.lng, antipode.lat],
      getSourceColor: [0, 200, 255],
      getTargetColor: [255, 0, 128],
      getWidth: 3,
      greatCircle: true
    }
  ] : [];

  // Markers
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
            greatCircle: true
          }),
          new ScatterplotLayer({
            id: "marker-layer",
            data: markers,
            getPosition: d => [d.lng, d.lat],
            getFillColor: [255, 140, 0],
            getRadius: 50000,
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
          placeholder="Enter location (e.g., Bangkok, Thailand)"
        />
        <button
          className="p-2 bg-blue-600 text-white rounded"
          onClick={handleSearch}
        >
          Find Antipode
        </button>
      </div>

      {origin && (
        <p className="absolute bottom-4 left-4 bg-black text-white p-2 rounded z-50">
          Origin: {origin.displayName} ({origin.lat.toFixed(4)}, {origin.lng.toFixed(4)})<br/>
          Antipode: {antipode.displayName} ({antipode.lat.toFixed(4)}, {antipode.lng.toFixed(4)})
        </p>
      )}
    </div>
  );
}
