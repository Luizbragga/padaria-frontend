// src/utils/routeSplit.js

// Distância de Haversine em METROS
function haversineMeters(a, b) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δφ = toRad(b.lat - a.lat);
  const Δλ = toRad(b.lng - a.lng);
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Distância de um ponto P ao conjunto de pontos (pára na menor)
function minDistToStops(p, stops) {
  if (!stops || stops.length === 0) return Infinity;
  let best = Infinity;
  for (const s of stops) {
    const d = haversineMeters(p, s);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Divide os pontos da rota B entre A e C.
 *
 * @param {Object} opts
 * @param {Array<{id:string,lat:number,lng:number,volume?:number}>} opts.routeAStops
 * @param {Array<{id:string,lat:number,lng:number,volume?:number}>} opts.routeBStops
 * @param {Array<{id:string,lat:number,lng:number,volume?:number}>} opts.routeCStops
 * @param {number=} opts.capacityA  Capacidade (peso/volume) opcional para A
 * @param {number=} opts.capacityC  Capacidade (peso/volume) opcional para C
 * @param {(p:any)=>number=} opts.getWeight  Função que retorna o “peso” de um ponto (default = 1)
 * @param {number=} opts.alpha  Peso do balanceamento 0..1 (0 = só distância). Default 0.8
 *
 * @returns {{paraA:Array, paraC:Array, resumo:{qtdParaA:number,qtdParaC:number,pesoA:number,pesoC:number}}}
 */
export function splitRouteB({
  routeAStops = [],
  routeBStops = [],
  routeCStops = [],
  capacityA,
  capacityC,
  getWeight = () => 1,
  alpha = 0.8,
} = {}) {
  const paraA = [];
  const paraC = [];

  let pesoA = 0;
  let pesoC = 0;

  for (const p of routeBStops) {
    const w = Math.max(0, Number(getWeight(p) ?? 1)) || 1;

    // distância até vizinhos de A e C
    const dA = minDistToStops(p, routeAStops);
    const dC = minDistToStops(p, routeCStops);

    // penalidade de carga (quanto mais cheio, maior o multiplicador)
    const capA = Number.isFinite(capacityA) ? capacityA : null;
    const capC = Number.isFinite(capacityC) ? capacityC : null;

    // fração carregada 0..1 (se não houver capacidade, usa balanceamento pela soma atual de pesos)
    const fracA =
      capA && capA > 0
        ? Math.min(1, pesoA / capA)
        : pesoA / (pesoA + pesoC + 1e-6);
    const fracC =
      capC && capC > 0
        ? Math.min(1, pesoC / capC)
        : pesoC / (pesoA + pesoC + 1e-6);

    // score: distância (m) * (1 + alpha * fração_carregada)
    const scoreA = dA * (1 + alpha * fracA);
    const scoreC = dC * (1 + alpha * fracC);

    // Se alguma capacidade estourar, força pro outro
    const estouraA = capA && pesoA + w > capA;
    const estouraC = capC && pesoC + w > capC;

    let vaiParaA;
    if (estouraA && !estouraC) {
      vaiParaA = false;
    } else if (!estouraA && estouraC) {
      vaiParaA = true;
    } else {
      // decide por menor score
      vaiParaA = scoreA <= scoreC;
    }

    if (vaiParaA) {
      paraA.push(p);
      pesoA += w;
      // Ao “mover”, passa a pertencer aos vizinhos de A
      routeAStops.push(p);
    } else {
      paraC.push(p);
      pesoC += w;
      routeCStops.push(p);
    }
  }

  return {
    paraA,
    paraC,
    resumo: {
      qtdParaA: paraA.length,
      qtdParaC: paraC.length,
      pesoA,
      pesoC,
    },
  };
}
