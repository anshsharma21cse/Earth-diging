import React, { useEffect, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import * as THREE from 'three'

// --- Texture URLs (public assets) ---
const textures = {
  day: 'https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-dark.jpg',
  night: 'https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-night.jpg',
  bump: 'https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-topology.png',
  specular: 'https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-specular.gif',
  clouds: 'https://raw.githubusercontent.com/roblabs/three-globe/master/example/img/earth-clouds.png'
}

export default function App() {
  const globeEl = useRef();
  const [query, setQuery] = useState('');
  const [markers, setMarkers] = useState([]);
  const [arcs, setArcs] = useState([]);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
  }, [theme]);

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
          side: THREE.DoubleSide
        });
        const cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudsMesh.name = 'clouds';
        globe.scene().add(cloudsMesh);

        const nightGeometry = new THREE.SphereGeometry(globe.getGlobeRadius() * 0.999, 64, 64);
        const nightMaterial = new THREE.MeshPhongMaterial({
          map: new THREE.TextureLoader().load(textures.day),
          emissiveMap: new THREE.TextureLoader().load(textures.night),
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.7,
          transparent: true,
          opacity: 0.95
        });
        const nightMesh = new THREE.Mesh(nightGeometry, nightMaterial);
        nightMesh.name = 'night';
        globe.scene().add(nightMesh);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        globe.scene().add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(5, 3, 5);
        globe.scene().add(dir);

      } catch (e) { console.warn('Globe init error', e); }
    };

    init();
    return () => {
      try {
        const sc = globe.scene();
        ['clouds', 'night'].forEach(name => {
          const obj = sc.getObjectByName(name);
          if (obj) sc.remove(obj);
        });
      } catch (e) {}
    };
  }, []);

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
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Antipode-Globe-App - YOUR_EMAIL@example.com' } });
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (!data || data.length === 0) throw new Error('No results found');
    const top = data[0];
    return { lat: Number(top.lat), lng: Number(top.lon), display_name: top.display_name };
  }

  function createArc(origin, ant) {
    return {
      startLat: origin.lat,
      startLng: origin.lng,
      endLat: ant.lat,
      endLng: ant.lng,
      color: ['rgba(0,200,255,0.9)', 'rgba(255,0,128,0.9)'],
    };
  }

  function addTunnelBetween(origin, ant) {
    const globe = globeEl.current;
    if (!globe) return;
    const sc = globe.scene();
    const existing = sc.getObjectByName('tunnel');
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
    const cylinderGeom = new THREE.CylinderGeometry(R * 0.06, R * 0.06, length + R * 0.1, 32, 1, true);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const cylinder = new THREE.Mesh(cylinderGeom, material);
    cylinder.name = 'tunnel';

    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    cylinder.position.copy(mid);

    const direction = new THREE.Vector3().subVectors(v2, v1
