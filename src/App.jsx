import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";

const textures = {
  day: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-dark.jpg",
  night: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-night.jpg",
  bump: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-topology.png",
  clouds: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-clouds.png"
};

export default function App() {
  const globeEl = useRef();
  const [query, setQuery] = useState("");
  const [arcs, setArcs] = useState([]);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  function normalizeLng(lng) {
    let v = ((lng + 180) % 360 + 360) % 360 - 180;
    return Object.is(v, -180) ? 180 : Number(v.toFixed(6));
  }

  function computeAntipode(lat, lng) {
    const antLat = -lat;
    let antLng = lng + 180;
    antLng = normalizeLng(antLng);
    return { lat: Number(antLat.toFixed(6)), lng: antLng };
  }

  async function geocodePlace(place) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      place
    )}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Antipode-Globe-App - example@example.com" }
    });
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    if (!data || data.length === 0) throw new Error("No results found");
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  }

  const handleSearch = async () => {
    try {
      const origin = await geocodePlace(query);
      const ant = computeAntipode(origin.lat, origin.lng);
      setArcs([{ startLat: origin.lat, startLng: origin.lng, endLat: ant.lat, endLng: ant.lng }]);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="w-full h-full relative">
      <Globe
        ref={globeEl}
        globeImageUrl={textures.day}
        bumpImageUrl={textures.bump}
        backgroundColor={theme === "dark" ? "#000000" : "#ffffff"}
        arcsData={arcs}
        arcColor={() => "cyan"}
        arcAltitude={0.2}
        arcStroke={1}
        width={window.innerWidth}
        height={window.innerHeight}
      />
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-50">
        <input
          className="p-2 border rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter location"
        />
        <button className="p-2 bg-blue-600 text-white rounded" onClick={handleSearch}>
          Find Antipode
        </button>
        <button
          className="p-2 bg-gray-600 text-white rounded"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          Toggle Theme
        </button>
      </div>
    </div>
  );
}
