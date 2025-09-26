// src/services/tomtomService.js
const TT_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
const OSRM_BASE = (
  import.meta.env.VITE_OSRM_URL || "https://router.project-osrm.org"
).replace(/\/+$/g, "");

/** Converte resposta TomTom em { coords, steps } */
function parseTomTomRoute(json) {
  const route = json && Array.isArray(json.routes) ? json.routes[0] : null;
  if (!route) return { coords: [], steps: [] };

  const coords = [];
  const legs = Array.isArray(route.legs) ? route.legs : [];
  if (legs.length) {
    for (const leg of legs) {
      const pts = Array.isArray(leg?.points) ? leg.points : [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (
          !p ||
          typeof p.latitude !== "number" ||
          typeof p.longitude !== "number"
        )
          continue;
        if (coords.length && i === 0) continue; // evita duplicar junção
        coords.push([p.latitude, p.longitude]);
      }
    }
  } else if (Array.isArray(route.points)) {
    for (const p of route.points) {
      if (
        !p ||
        typeof p.latitude !== "number" ||
        typeof p.longitude !== "number"
      )
        continue;
      coords.push([p.latitude, p.longitude]);
    }
  }
  return { coords, steps: [] };
}

/** Converte resposta OSRM em { coords, steps } */
function parseOsrmRoute(json) {
  const route = json && Array.isArray(json.routes) ? json.routes[0] : null;
  if (!route) return { coords: [], steps: [] };
  // OSRM geometries=geojson → coordinates: [lng, lat]
  const coords =
    Array.isArray(route.geometry?.coordinates) &&
    route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { coords: coords || [], steps: [] };
}

/** Bearing A->B (graus) — usado ocasionalmente */
function bearingDeg(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const toDeg = (x) => (x * 180) / Math.PI;
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let br = toDeg(Math.atan2(y, x));
  br = (br + 360) % 360;
  return Math.round(br);
}

/* ---------------- TomTom: A->B (mantido) ---------------- */
export async function routeAB(a, b, signal) {
  if (!TT_KEY) {
    const err = new Error("VITE_TOMTOM_API_KEY ausente");
    err.status = 0;
    throw err;
  }
  const locs = `${a.lat.toFixed(6)},${a.lng.toFixed(6)}:${b.lat.toFixed(
    6
  )},${b.lng.toFixed(6)}`;
  const base = "https://api.tomtom.com/routing/1/calculateRoute";

  const vehicleHeading = bearingDeg(a, b);
  const params = new URLSearchParams({
    key: TT_KEY,
    traffic: "true",
    routeType: "fastest",
    travelMode: "car",
    routeRepresentation: "polyline",
    avoid: "unpavedRoads",
    vehicleHeading: String(vehicleHeading),
  });

  // tentativa “completa”
  let res = await fetch(`${base}/${encodeURIComponent(locs)}/json?${params}`, {
    signal,
  });

  // fallback (remove opcionais em 400)
  if (!res.ok && res.status === 400) {
    params.delete("vehicleHeading");
    res = await fetch(`${base}/${encodeURIComponent(locs)}/json?${params}`, {
      signal,
    });
  }
  if (!res.ok && res.status === 400) {
    params.delete("avoid");
    res = await fetch(`${base}/${encodeURIComponent(locs)}/json?${params}`, {
      signal,
    });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`TomTom ${res.status}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  return parseTomTomRoute(data);
}

/* ---------------- OSRM fallback: multi-pontos ---------------- */
async function osrmRouteMulti(points, signal) {
  if (!Array.isArray(points) || points.length < 2) {
    return { coords: [], steps: [] };
  }
  // OSRM espera "lon,lat;lon,lat;..."
  const locs = points
    .map((p) => `${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`)
    .join(";");
  const url = `${OSRM_BASE}/route/v1/driving/${locs}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`OSRM ${res.status}`);
    err.status = res.status;
    err.body = t;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  return parseOsrmRoute(data);
}

/* ---------------- TomTom multi-pontos com fallback ---------------- */
export async function routeMulti(points, signal) {
  if (!Array.isArray(points) || points.length < 2) {
    return { coords: [], steps: [] };
  }

  // Tenta TomTom primeiro (se houver key)
  if (TT_KEY) {
    try {
      const locs = points
        .map((p) => `${Number(p.lat).toFixed(6)},${Number(p.lng).toFixed(6)}`)
        .join(":");
      const base = "https://api.tomtom.com/routing/1/calculateRoute";
      const params = new URLSearchParams({
        key: TT_KEY,
        traffic: "true",
        routeType: "fastest",
        travelMode: "car",
        routeRepresentation: "polyline",
        avoid: "unpavedRoads",
      });
      let res = await fetch(
        `${base}/${encodeURIComponent(locs)}/json?${params.toString()}`,
        { signal }
      );

      // 400 → remove "avoid"
      if (!res.ok && res.status === 400) {
        params.delete("avoid");
        res = await fetch(
          `${base}/${encodeURIComponent(locs)}/json?${params.toString()}`,
          { signal }
        );
      }

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return parseTomTomRoute(data);
      }

      // 401/403 → cai para OSRM
      if (res.status === 401 || res.status === 403) {
        return await osrmRouteMulti(points, signal);
      }

      // outros erros: lança
      const text = await res.text().catch(() => "");
      const err = new Error(`TomTom ${res.status}`);
      err.status = res.status;
      err.body = text;
      throw err;
    } catch (e) {
      // Falha de rede ou TomTom indisponível → tenta OSRM
      try {
        return await osrmRouteMulti(points, signal);
      } catch {
        throw e; // mantém o erro original se OSRM também falhar
      }
    }
  }

  // Sem key: usa OSRM direto
  return await osrmRouteMulti(points, signal);
}

export { parseTomTomRoute };
