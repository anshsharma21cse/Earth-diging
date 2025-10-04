import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";

// --- Texture URLs (public assets) ---
const textures = {
  day: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-dark.jpg",
  night: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-night.jpg",
  bump: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-topology.png",
  specular: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-specular.gif",
  clouds: "https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-clouds.png",
};

export default function App() {
  const globeEl = useRef();
  const [query, setQuery] = useState("");
  const [markers, setMarkers] = useState([]);
  const [arcs, setArcs] = useState([]);
  const [theme, setTheme] = useState("dark");

  // --- Theme handling ---
  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  // --- Globe initialization ---
  useEffect(() => {
    if (!globeEl.current) return;
    const globe = globeEl.current;

    const init = () => {
      try {
        const cloudRadius = globe.getGlobeRadius() * 1.005;
        const cloudGeometry = new THREE.SphereGeometry(cloudRadius, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
          map: new THREE.TextureLoader().load(textures.clouds),
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudsMesh.name = "clouds";
        globe.scene().add(cloudsMesh);

        const nightGeometry = new THREE.SphereGeometry(
          globe.getGlobeRadius() * 0.999,
          64,
          64
        );
        const nightMaterial = new THREE.MeshPhongMaterial({
          map: new THREE.TextureLoader().load(textures.day),
          emissiveMap: new THREE.TextureLoader().load(textures.night),
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.7,
          transparent: true,
          opacity: 0.95,
        });
        const nightMesh = new THREE.Mesh(nightGeometry, nightMaterial);
        nightMesh.name = "night";
        globe.scene().add(nightMesh);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        globe.scene().add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(5, 3, 5);
        globe.scene().add(dir);
      } catch (e) {
        console.warn("Globe init error", e);
      }
    };

    init();

    return () => {
      try {
        const sc = globe.scene();
        ["clouds", "night"].forEach((name) => {
          const obj = sc.getObjectByName(name);
          if (obj) sc.remove(obj);
        });
      } catch (e) {}
    };
  }, []);

  // --- Coordinate helpers ---
  function normalizeLng(lng) {
    let v = ((lng + 180) % 360 + 360) % 360 - 180;
    if (Object.is(v, -180)) return 180;
    return Number(v.toFixed(6));
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
      headers: { "User-Agent": "Antipode-Globe-App - example@example.com" },
    });
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    if (!data || data.length === 0) throw new Error("No results found");
    const top = data[0];
    return {
      lat: Number(top.lat),
      lng: Number(top.lon),
      display_name: top.display_name,
    };
  }

  function createArc(origin, ant) {
    return {
      startLat: origin.lat,
      startLng: origin.lng,
      endLat: ant.lat,
      endLng: ant.lng,
      color: ["rgba(0,200,255,0.9)", "rgba(255,0,128,0.9)"],
    };
  }

  // --- Tunnel animation ---
  function addTunnelBetween(origin, ant) {
    const globe = globeEl.current;
    if (!globe) return;
    const sc = globe.scene();
    const existing = sc.getObjectByName("tunnel");
    if (existing) sc.remove(existing);

    const R = globe.getGlobeRadius();
    const toVec = (lat, lng) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const x = -R * Math.sin(phi) * Math.cos(theta);
      const z = R * Math.sin(phi) * Math.sin(theta);
      const y = R * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    };

    const v1 = toVec(origin.lat, origin.lng);
    const v2 = toVec(ant.lat, ant.lng);

    const length = v1.distanceTo(v2);
    const cylinderGeom = new THREE.CylinderGeometry(
      R * 0.06,
      R * 0.06,
      length + R * 0.1,
      32,
      1,
      true
    );
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cylinder = new THREE.Mesh(cylinderGeom, material);
    cylinder.name = "tunnel";

    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    cylinder.position.copy(mid);

    const direction = new THREE.Vector3().subVectors(v2, v1);
    const axis = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const angle = Math.acos(
      direction.normalize().dot(new THREE.Vector3(0, 1, 0))
    );
    cylinder.quaternion.setFromAxisAngle(axis, angle);

    sc.add(cylinder);
  }

  // --- Search handler ---
  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const loc = await geocodePlace(query);
      const ant = computeAntipode(loc.lat, loc.lng);
      setMarkers([
        { lat: loc.lat, lng: loc.lng, label: "Origin" },
        { lat: ant.lat, lng: ant.lng, label: "Antipode" },
      ]);
      setArcs([createArc(loc, ant)]);
      addTunnelBetween(loc, ant);
      globeEl.current.pointOfView(
        { lat: loc.lat, lng: loc.lng, altitude: 2.2 },
        2000
      );
    } catch (err) {
      alert("Could not find location: " + err.message);
    }
  }

  // --- Utility buttons ---
  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  function captureImage() {
    const renderer = globeEl.current.renderer();
    const canvas = renderer.domElement;
    const link = document.createElement("a");
    link.download = "antipode-globe.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // --- Render ---
  return (
    <div
      className={`w-screen h-screen ${
        theme === "dark" ? "bg-gray-950 text-white" : "bg-white text-gray-900"
      }`}
    >
      <div
        className="absolute top-2 left-2 p-3 rounded-2xl shadow-lg bg-opacity-90 z-10"
        style={{
          background:
            theme === "dark"
              ? "rgba(20,20,30,0.8)"
              : "rgba(255,255,255,0.9)",
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a location..."
            className="px-3 py-2 rounded-xl border border-gray-400 bg-transparent"
          />
          <button
            type="submit"
            className="small-btn bg-blue-500 text-white hover:bg-blue-600"
          >
            Search
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="small-btn bg-gray-600 text-white hover:bg-gray-700"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            type="button"
            onClick={captureImage}
            className="small-btn bg-green-500 text-white hover:bg-green-600"
          >
            📸
          </button>
        </form>
      </div>

      <Globe
        ref={globeEl}
        globeImageUrl={textures.day}
        bumpImageUrl={textures.bump}
        showAtmosphere={true}
        atmosphereColor="lightskyblue"
        atmosphereAltitude={0.2}
        arcsData={arcs}
        arcColor={"color"}
        arcDashLength={0.4}
        arcDashGap={1.5}
        arcDashAnimateTime={2500}
        labelsData={markers}
        labelLat={(d) => d.lat}
        labelLng={(d) => d.lng}
        labelText={(d) => d.label}
        labelSize={1.2}
        labelColor={() =>
          theme === "dark"
            ? "rgba(255,255,255,0.9)"
            : "rgba(0,0,0,0.8)"
        }
        labelResolution={2}
      />
    </div>
  );
}
