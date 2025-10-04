import React, { useState, useRef, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { ArcLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import maplibregl from "maplibre-gl";

// Map style
const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

// Compute antipode
function computeAntipode(lat, lng) {
  let antLat = -lat;
  let antLng = lng + 180;
  if (antLng > 180) antLng -= 360;
  return { lat: antLat, lng: antLng };
}

// Reverse geocode antipode location name
async function getLocationName(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    { headers: { "User-Agent": "Accurate-Antipode-App" } }
  );
  const data = await res.json();
  return data.display_name || "Unknown location";
}

// Fetch short description from Wikipedia
async function getLocationDescription(name) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
    );
    const data = await res.json();
    return data.extract ? data.extract : "No description available.";
  } catch {
    return "No description available.";
  }
}

// Typewriter animation for text
function Typewriter({ text, speed = 30 }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text[i]);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return <p>{displayed}</p>;
}

export default function App() {
  const [locationInput, setLocationInput] = useState("");
  const [origin, setOrigin] = useState(null);
  const [antipode, setAntipode] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Click-to-correct origin
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

      // Fly to origin
      map.flyTo({ center: [lng, lat], zoom: 2 });
    };

    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [mapRef.current]);

  // Handle search input
  const handleSearch = async () => {
    if (!locationInput) return;
    setLoading(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`,
        { headers: { "User-Agent": "Accurate-Antipode-App" } }
      );
      const data = await res.json();
      if (!data || data.length === 0) {
        alert("Location not found");
        setLoading(false);
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      const displayName = data[0].display_name;

      setOrigin({ lat, lng, displayName });

      const antCoords = computeAntipode(lat, lng);
      const name = await getLocationName(antCoords.lat, antCoords.lng);
      const description = await getLocationDescription(name);

      setAntipode({
        lat: antCoords.lat,
        lng: antCoords.lng,
        name,
        description,
      });

      // Fly to origin
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [lng, lat], zoom: 2 });
      }

    } catch (err) {
      console.error(err);
      alert("Error fetching location data");
    }

    setLoading(false);
  };

  // Arc layer
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
      {/* Map container */}
      <div ref={mapContainer} className="absolute w-full h-full z-0" />

      {/* DeckGL layers */}
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

      {/* Search panel */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-50">
        <input
          className="p-2 border rounded"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          placeholder="Enter location (e.g., Indore, Madhya Pradesh)"
        />
        <button
          className="p-2 bg-blue-600 text-white rounded"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Finding..." : "Find Antipode"}
        </button>
      </div>

      {/* Animated antipode info */}
      {antipode && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 p-4 rounded shadow-lg max-w-sm animate-fadeIn text-white z-50">
          <h2 className="text-xl font-bold mb-2">Antipode Info</h2>
          <Typewriter text={`Name: ${antipode.name}`} speed={50} />
          <Typewriter text={`Coordinates: ${antipode.lat.toFixed(4)}, ${antipode.lng.toFixed(4)}`} speed={40} />
          <Typewriter text={`Description: ${antipode.description}`} speed={30} />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          0% {opacity: 0; transform: translateY(20px);}
          100% {opacity: 1; transform: translateY(0);}
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
