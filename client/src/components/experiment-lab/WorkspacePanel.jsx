import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsDown, RotateCw, ThermometerSun, Trash2 } from 'lucide-react';
import { soundManager } from '../../utils/soundManager';

const FLOW_STEPS = [0.1, 0.5, 1, 5, 10, 20, 50];

const CHEMICALS = {
  hcl: { name: 'HCl', ph: 1.1, color: '#f2fbff', kind: 'acid', model: 'strong-acid', molarity: 0.1, equivalents: 1, conductivityFactor: 6.8 },
  naoh: { name: 'NaOH', ph: 13.2, color: '#eefcff', kind: 'base', model: 'strong-base', molarity: 0.1, equivalents: 1, conductivityFactor: 5.7 },
  h2so4: { name: 'H2SO4', ph: 0.5, color: '#f6f2d5', kind: 'acid', model: 'strong-acid', molarity: 0.1, equivalents: 2, conductivityFactor: 7.2 },
  hno3: { name: 'HNO3', ph: 0.8, color: '#fff4c2', kind: 'acid', model: 'strong-acid', molarity: 0.1, equivalents: 1, conductivityFactor: 6.5 },
  edta_acid: { name: 'EDTA Acid', ph: 2.2, color: '#eef7ff', kind: 'acid', model: 'chelator', molarity: 0.05, ka: 1.0e-2, conductivityFactor: 1.8, chelationFactor: 1 },
  acetic_acid: { name: 'Acetic Acid', ph: 2.9, color: '#ffffff', kind: 'acid', model: 'weak-acid', molarity: 0.1, ka: 1.8e-5, conductivityFactor: 1.4 },
  citric_acid: { name: 'Citric Acid', ph: 3.2, color: '#fff6d8', kind: 'acid', model: 'weak-acid', molarity: 0.08, ka: 7.4e-4, conductivityFactor: 1.2 },
  kmno4: { name: 'KMnO4', ph: 7, color: '#6f1d9b', kind: 'oxidizer', model: 'salt', molarity: 0.05, conductivityFactor: 3.6 },
  cuso4: { name: 'CuSO4', ph: 4.6, color: '#1e78ff', kind: 'salt', model: 'salt', molarity: 0.1, conductivityFactor: 4.8 },
  agno3: { name: 'AgNO3', ph: 6.2, color: '#fcfdff', kind: 'salt', model: 'salt', molarity: 0.1, conductivityFactor: 4.5 },
  k2cr2o7: { name: 'K2Cr2O7', ph: 4, color: '#f08c00', kind: 'oxidizer', model: 'salt', molarity: 0.05, conductivityFactor: 3.4 },
  koh: { name: 'KOH', ph: 13.4, color: '#f3fdff', kind: 'base', model: 'strong-base', molarity: 0.1, equivalents: 1, conductivityFactor: 5.9 },
  nh4oh: { name: 'NH4OH', ph: 11.6, color: '#effcff', kind: 'base', model: 'weak-base', molarity: 0.1, kb: 1.8e-5, conductivityFactor: 2.2 },
  ammonia_buffer: { name: 'Ammonia Buffer Solution', ph: 10.2, color: '#e6fbff', kind: 'base', model: 'buffer', molarity: 0.1, conductivityFactor: 2.4 },
  phenolphthalein: { name: 'Phenolphthalein', ph: 8.5, color: '#ffffff', indicator: true, model: 'indicator', conductivityFactor: 0.1 },
  methyl_orange: { name: 'Methyl Orange', ph: 4, color: '#ffa500', indicator: true, model: 'indicator', conductivityFactor: 0.1 },
  ebt: { name: 'Eriochrome Black T', ph: 10, color: '#5b21b6', indicator: true, model: 'indicator', conductivityFactor: 0.1 },
  bromothymol_blue: { name: 'Bromothymol Blue', ph: 7, color: '#4aa8ff', indicator: true, model: 'indicator', conductivityFactor: 0.1 },
  litmus: { name: 'Litmus', ph: 7, color: '#7c3aed', indicator: true, model: 'indicator', conductivityFactor: 0.1 },
  universal_indicator: { name: 'Universal Indicator', ph: 7, color: '#22c55e', indicator: true, model: 'indicator', conductivityFactor: 0.12 },
  ethanol: { name: 'Ethanol', ph: 7, color: '#ecfbff', kind: 'organic', model: 'solvent', conductivityFactor: 0.02 },
  water: { name: 'Distilled Water', ph: 7, color: '#c4e8ff', kind: 'neutral', model: 'solvent', molarity: 0, normality: 0, equivalents: 0, conductivityFactor: 0.05 },
  tap_water: { name: 'Tap Water', ph: 7.5, color: '#a9ddff', kind: 'sample', model: 'salt', molarity: 0.025, conductivityFactor: 1.9, hardnessFactor: 1.2 },
  river_water: { name: 'River Water', ph: 7.2, color: '#8fd4c5', kind: 'sample', model: 'salt', molarity: 0.04, conductivityFactor: 2.6, hardnessFactor: 1.8 }
};

const CAPS = {
  beaker: 250,
  conical_flask: 250,
  burette: 50,
  pipette: 25,
  bunsen_burner: 0,
  test_tube: 50,
  magnetic_stirrer: 0,
  ph_meter: 0,
  conductivity_meter: 0,
  thermometer: 0,
  dropper: 5,
  stand_clamp: 0
};

const vesselTypes = new Set(['beaker', 'conical_flask', 'test_tube', 'burette', 'pipette', 'dropper']);

function blendHexColors(colors = []) {
  const valid = colors.filter(Boolean);
  if (!valid.length) return '#c4e8ff';

  const mixed = valid.reduce((acc, color) => {
    const clean = color.replace('#', '');
    const normalized = clean.length === 3 ? clean.split('').map((char) => `${char}${char}`).join('') : clean;
    const int = Number.parseInt(normalized, 16);
    if (!Number.isFinite(int)) return acc;
    acc.r += (int >> 16) & 255;
    acc.g += (int >> 8) & 255;
    acc.b += int & 255;
    return acc;
  }, { r: 0, g: 0, b: 0 });

  return `rgb(${Math.round(mixed.r / valid.length)}, ${Math.round(mixed.g / valid.length)}, ${Math.round(mixed.b / valid.length)})`;
}

function getComputedColor(ph, reagents, context = {}) {
  const hasPhenol = reagents.includes('phenolphthalein');
  const hasMethyl = reagents.includes('methyl_orange');
  const hasEbt = reagents.includes('ebt');
  const hasBtb = reagents.includes('bromothymol_blue');
  const hasLitmus = reagents.includes('litmus');
  const hasUniversal = reagents.includes('universal_indicator');
  const hasCopper = reagents.includes('cuso4');
  const hasPermanganate = reagents.includes('kmno4');
  const hasNitric = reagents.includes('hno3');
  const hasEdta = reagents.includes('edta_acid');
  const hasRiverWater = reagents.includes('river_water');
  const hasTapWater = reagents.includes('tap_water');
  const hasBase = reagents.includes('naoh') || reagents.includes('koh');
  const hasHardnessIndicatorSetup = hasEbt && reagents.includes('ammonia_buffer') && (hasTapWater || hasRiverWater || (context.hardnessMoles || 0) > 0);

  if (hasUniversal) {
    if (ph < 2.5) return '#c1121f';
    if (ph < 4) return '#f97316';
    if (ph < 6) return '#facc15';
    if (ph < 7.6) return '#22c55e';
    if (ph < 9.2) return '#0ea5e9';
    if (ph < 11) return '#2563eb';
    return '#7c3aed';
  }
  if (hasHardnessIndicatorSetup) {
    if (context.endpointReached) return '#2563eb';
    if ((context.endpointProgress || 0) > 0.85) return '#7dd3fc';
    return '#7c2d12';
  }
  if (hasEbt && ph >= 10) return '#2563eb';
  if (hasEbt) return '#7c2d12';
  if (hasBtb && ph < 6) return '#facc15';
  if (hasBtb && ph > 7.6) return '#2563eb';
  if (hasBtb) return '#22c55e';
  if (hasLitmus && ph < 6.5) return '#dc2626';
  if (hasLitmus && ph > 8.2) return '#2563eb';
  if (hasLitmus) return '#7c3aed';
  if (hasPhenol && ph > 8.2) return '#ff1493';
  if (hasPhenol && ph > 7.3) return '#ffb6c1';
  if (hasPhenol) return '#f8fbff';
  if (hasMethyl && ph < 3.2) return '#ff4500';
  if (hasMethyl && ph > 4.5) return '#ffd700';
  if (hasPermanganate) return '#6f1d9b';
  if (hasCopper) return '#1e78ff';
  if (hasNitric) return '#fff4c2';
  if (hasEdta) return '#eef7ff';
  if (hasRiverWater) return '#8fd4c5';
  if (hasTapWater) return '#a9ddff';
  if (hasBase && ph > 11.5) return '#eefcff';

  const mixed = reagents.map((id) => CHEMICALS[id]?.color).filter(Boolean);
  if (mixed.length > 1) return blendHexColors(mixed);

  const first = CHEMICALS[reagents[0]] || CHEMICALS.water;
  return first?.color || '#ffffff';
}

function mergeComposition(base = {}, extra = {}) {
  const merged = { ...base };
  Object.entries(extra).forEach(([id, volume]) => {
    merged[id] = Number((merged[id] || 0) + (volume || 0));
    if (merged[id] <= 1e-6) delete merged[id];
  });
  return merged;
}

function scaleComposition(composition = {}, ratio = 1) {
  return Object.fromEntries(
    Object.entries(composition)
      .map(([id, volume]) => [id, Number(volume) * ratio])
      .filter(([, volume]) => volume > 1e-6)
  );
}

function solveWeakAcidPh(concentration, ka) {
  if (concentration <= 0 || !ka) return 7;
  const hydrogen = Math.sqrt(ka * concentration);
  return clamp(-Math.log10(Math.max(hydrogen, 1e-12)), 0, 14);
}

function solveWeakBasePh(concentration, kb) {
  if (concentration <= 0 || !kb) return 7;
  const hydroxide = Math.sqrt(kb * concentration);
  return clamp(14 + Math.log10(Math.max(hydroxide, 1e-12)), 0, 14);
}

function deriveSolutionMetrics(volumeMl, composition = {}, fallbackReagents = [], tempC = 25) {
  const safeVolumeMl = Math.max(volumeMl || 0, 0);
  const totalLiters = Math.max(safeVolumeMl / 1000, 1e-6);
  const reagents = [...new Set([...Object.keys(composition).filter((id) => (composition[id] || 0) > 1e-9), ...fallbackReagents])];

  if (!safeVolumeMl || !reagents.length) {
    return {
      volume: safeVolumeMl,
      composition: {},
      reagents: [],
      ph: 7,
      conductivity: 0.05,
      color: '#ffffff',
      tempC
    };
  }

  let strongAcidEq = 0;
  let strongBaseEq = 0;
  let weakAcidPh = null;
  let weakBasePh = null;
  let bufferPh = null;
  let ionicContribution = 0;
  let saltContribution = 0;
  let hardnessMoles = 0;
  let edtaCapacity = 0;

  reagents.forEach((id) => {
    const chemical = CHEMICALS[id];
    const moles = Number(composition[id] || 0);
    if (!chemical || moles <= 0) return;

    ionicContribution += moles * (chemical.conductivityFactor || 0.08);

    if (chemical.model === 'strong-acid') {
      strongAcidEq += moles * (chemical.equivalents || 1);
    } else if (chemical.model === 'strong-base') {
      strongBaseEq += moles * (chemical.equivalents || 1);
    } else if (chemical.model === 'weak-acid') {
      weakAcidPh = solveWeakAcidPh(moles / totalLiters, chemical.ka);
    } else if (chemical.model === 'weak-base') {
      weakBasePh = solveWeakBasePh(moles / totalLiters, chemical.kb);
    } else if (chemical.model === 'buffer') {
      bufferPh = chemical.ph ?? 10.2;
    } else if (chemical.model === 'chelator') {
      edtaCapacity += moles * (chemical.chelationFactor || 1);
      weakAcidPh = solveWeakAcidPh(moles / totalLiters, chemical.ka);
    } else if (chemical.model === 'salt') {
      saltContribution += moles * (chemical.conductivityFactor || 0.08);
    }

    if (chemical.hardnessFactor) {
      hardnessMoles += moles * chemical.hardnessFactor;
    }
  });

  const neutralizedEq = Math.min(strongAcidEq, strongBaseEq);
  const remainingAcidEq = Math.max(0, strongAcidEq - strongBaseEq);
  const remainingBaseEq = Math.max(0, strongBaseEq - strongAcidEq);

  let ph = 7;
  if (remainingAcidEq > 1e-9) {
    const hydrogen = remainingAcidEq / totalLiters;
    ph = clamp(-Math.log10(Math.max(hydrogen, 1e-12)), 0, 14);
  } else if (remainingBaseEq > 1e-9) {
    const hydroxide = remainingBaseEq / totalLiters;
    ph = clamp(14 + Math.log10(Math.max(hydroxide, 1e-12)), 0, 14);
  } else if (bufferPh !== null) {
    ph = bufferPh;
  } else if (weakAcidPh !== null && weakBasePh === null) {
    ph = weakAcidPh;
  } else if (weakBasePh !== null && weakAcidPh === null) {
    ph = weakBasePh;
  }

  const hydrogenContribution = remainingAcidEq > 0 ? (remainingAcidEq / totalLiters) * 22 : 0;
  const hydroxideContribution = remainingBaseEq > 0 ? (remainingBaseEq / totalLiters) * 15 : 0;
  const neutralSaltContribution = neutralizedEq * 8;
  const hardnessRemaining = Math.max(0, hardnessMoles - edtaCapacity);
  const hardnessComplexed = Math.min(hardnessMoles, edtaCapacity);
  const endpointProgress = hardnessMoles > 1e-9 ? clamp(hardnessComplexed / hardnessMoles, 0, 1) : 0;
  const endpointReached = hardnessMoles > 1e-9 && hardnessRemaining <= Math.max(1e-6, hardnessMoles * 0.03);
  const conductivity = Number((
    Math.max(
      0.05,
      ((ionicContribution + saltContribution + neutralSaltContribution) / totalLiters) +
      hydrogenContribution +
      hydroxideContribution -
      (hardnessComplexed / totalLiters) * 2.4
    )
  ).toFixed(2));

  return {
    volume: safeVolumeMl,
    composition,
    reagents,
    ph: Number(ph.toFixed(2)),
    conductivity,
    color: getComputedColor(ph, reagents, { hardnessMoles, endpointProgress, endpointReached }),
    tempC,
    hardnessMoles: Number(hardnessMoles.toFixed(6)),
    hardnessRemaining: Number(hardnessRemaining.toFixed(6)),
    endpointProgress: Number(endpointProgress.toFixed(3)),
    endpointReached
  };
}

function resolveMolarityFromNormality(chem, normality, fallbackMolarity) {
  if (!Number.isFinite(normality)) return fallbackMolarity;
  if (normality === 0) return 0;
  const equivalents = chem?.equivalents;
  if (Number.isFinite(equivalents) && equivalents > 0) {
    return normality / equivalents;
  }
  return normality;
}

function getSolutionStrength(inst, reagentId) {
  const totalMoles = Object.values(inst?.composition || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  if ((inst?.volume || 0) > 0 && totalMoles > 0) {
    return totalMoles / Math.max(inst.volume / 1000, 1e-6);
  }
  const molarity = CHEMICALS[reagentId]?.molarity;
  return Number.isFinite(molarity) ? molarity : 0.1;
}

function getLiquidZone(vessel) {
  if (!vessel?.capacity || vessel.volume <= 0) return null;

  if (vessel.type === 'beaker') {
    const fill = (vessel.volume / Math.max(1, vessel.capacity)) * 92;
    return {
      x1: vessel.x + 16,
      x2: vessel.x + 80,
      yTop: vessel.y + 106 - fill,
      yBottom: vessel.y + 106,
      fillRatio: vessel.volume / Math.max(1, vessel.capacity)
    };
  }

  if (vessel.type === 'conical_flask') {
    const fill = (vessel.volume / Math.max(1, vessel.capacity)) * 68;
    return {
      x1: vessel.x + 18,
      x2: vessel.x + 78,
      yTop: vessel.y + 106 - fill,
      yBottom: vessel.y + 106,
      fillRatio: vessel.volume / Math.max(1, vessel.capacity)
    };
  }

  if (vessel.type === 'test_tube') {
    const fill = (vessel.volume / Math.max(1, vessel.capacity)) * 98;
    return {
      x1: vessel.x + 7,
      x2: vessel.x + 29,
      yTop: vessel.y + 108 - fill,
      yBottom: vessel.y + 108,
      fillRatio: vessel.volume / Math.max(1, vessel.capacity)
    };
  }

  return null;
}

function getProbeTip(probe) {
  if (!probe) return null;
  if (probe.type === 'ph_meter') return { x: probe.x + 32, y: probe.y + 164 };
  if (probe.type === 'conductivity_meter') return { x: probe.x + 36, y: probe.y + 168 };
  if (probe.type === 'thermometer') return { x: probe.x + 25, y: probe.y + 98 };
  return null;
}

function getProbeSample(probe, vessels) {
  const tip = getProbeTip(probe);
  if (!tip) return null;

  const sample = vessels
    .map((vessel) => ({ vessel, zone: getLiquidZone(vessel) }))
    .filter((entry) => entry.zone)
    .find(({ zone }) => tip.x >= zone.x1 && tip.x <= zone.x2 && tip.y >= zone.yTop && tip.y <= zone.yBottom);

  if (!sample) return null;

  const immersionRatio = clamp((tip.y - sample.zone.yTop) / Math.max(1, sample.zone.yBottom - sample.zone.yTop), 0, 1);
  return immersionRatio >= 0.12 ? { vessel: sample.vessel, immersionRatio } : null;
}

function getSnapTarget(inst, instances, nextX, nextY) {
  if (inst.type === 'burette') {
    const stand = instances.find((item) => item.uid !== inst.uid && item.type === 'stand_clamp');
    if (stand && Math.abs(nextX - (stand.x + 28)) < 48 && Math.abs(nextY - (stand.y - 8)) < 60) {
      return { x: stand.x + 28, y: stand.y - 8, label: 'Burette snapped to stand clamp.' };
    }
  }

  if (['conical_flask', 'beaker', 'test_tube'].includes(inst.type)) {
    const stirrer = instances.find((item) => item.uid !== inst.uid && item.type === 'magnetic_stirrer');
    if (stirrer && Math.abs(nextX - stirrer.x) < 56 && Math.abs(nextY - (stirrer.y - 112)) < 72) {
      return { x: stirrer.x, y: stirrer.y - 112, label: 'Vessel aligned on stirrer plate.' };
    }

    const burner = instances.find((item) => item.uid !== inst.uid && item.type === 'bunsen_burner');
    if (burner && Math.abs(nextX - burner.x) < 58 && Math.abs(nextY - (burner.y - 120)) < 76) {
      return { x: burner.x, y: burner.y - 120, label: 'Vessel centered above burner.' };
    }
  }

  if (inst.type === 'thermometer' || inst.type === 'ph_meter' || inst.type === 'conductivity_meter') {
    const vessel = instances.find((item) => item.uid !== inst.uid && ['conical_flask', 'beaker', 'test_tube'].includes(item.type));
    if (vessel && Math.abs(nextX - (vessel.x + 70)) < 52 && Math.abs(nextY - (vessel.y - 6)) < 74) {
      return {
        x: vessel.x + 70,
        y: vessel.y - 6,
        label: `${inst.type === 'ph_meter' ? 'pH meter' : inst.type === 'conductivity_meter' ? 'Conductivity meter' : 'Thermometer'} aligned for reading.`
      };
    }
  }

  return null;
}

const Instruments2D = {
  beaker: ({ inst, active }) => {
    const fill = (inst.volume / Math.max(1, inst.capacity)) * 92;
    return (
      <svg width="96" height="110" viewBox="0 0 96 110" className={active ? 'drop-shadow-[0_0_14px_rgba(14,165,233,0.7)]' : ''}>
        <path d="M 14 6 L 14 100 Q 14 106 20 106 L 76 106 Q 82 106 82 100 L 82 6" fill="rgba(255,255,255,0.18)" stroke="#94a3b8" strokeWidth="3" />
        <rect x="16" y={106 - fill} width="64" height={fill} fill={inst.color} opacity={inst.volume > 0 ? 0.84 : 0} style={{ mixBlendMode: 'multiply', transition: 'fill 280ms ease, opacity 280ms ease' }} />
        {inst.volume > 0 && (
          <motion.rect
            x="20"
            y={Math.max(12, 108 - fill)}
            width="56"
            height="8"
            rx="4"
            fill="rgba(255,255,255,0.36)"
            animate={{ x: [20, 24, 20] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
        <path d="M 22 10 Q 26 34 22 88" stroke="rgba(255,255,255,0.42)" strokeWidth="3" strokeLinecap="round" />
        {[50, 100, 150, 200, 250].map((m) => {
          const y = 106 - (m / 250) * 92;
          return <line key={m} x1="14" x2="28" y1={y} y2={y} stroke="#94a3b8" strokeWidth="1" />;
        })}
      </svg>
    );
  },
  conical_flask: ({ inst, active }) => {
    const clipId = `flask-${inst.uid}`;
    const fill = (inst.volume / Math.max(1, inst.capacity)) * 68;
    return (
      <svg width="96" height="112" viewBox="0 0 96 112" className={active ? 'drop-shadow-[0_0_14px_rgba(14,165,233,0.7)]' : ''}>
        <path d="M 36 6 L 36 32 L 16 94 Q 12 106 22 106 L 74 106 Q 84 106 80 94 L 60 32 L 60 6 Z" fill="rgba(255,255,255,0.16)" stroke="#94a3b8" strokeWidth="3" />
        <g clipPath={`url(#${clipId})`}>
          <rect x="12" y={106 - fill} width="72" height={fill} fill={inst.color} opacity={inst.volume > 0 ? 0.84 : 0} style={{ mixBlendMode: 'multiply', transition: 'fill 280ms ease, opacity 280ms ease' }} />
          {inst.volume > 0 && (
            <motion.ellipse
              cx="48"
              cy={Math.max(24, 104 - fill)}
              rx="26"
              ry="5"
              fill="rgba(255,255,255,0.34)"
              animate={{ cx: [48, 52, 48] }}
              transition={{ repeat: Infinity, duration: 2.4 }}
            />
          )}
        </g>
        <path d="M 42 10 Q 46 34 36 92" stroke="rgba(255,255,255,0.38)" strokeWidth="3" strokeLinecap="round" />
        <defs>
          <clipPath id={clipId}>
            <path d="M 36 6 L 36 32 L 16 94 Q 12 106 22 106 L 74 106 Q 84 106 80 94 L 60 32 L 60 6 Z" />
          </clipPath>
        </defs>
      </svg>
    );
  },
  burette: ({ inst, active }) => {
    const fill = (inst.volume / Math.max(1, inst.capacity)) * 196;
    return (
      <svg width="38" height="256" viewBox="0 0 38 256" className={active ? 'drop-shadow-[0_0_14px_rgba(14,165,233,0.7)]' : ''}>
        <rect x="13" y="6" width="12" height="196" fill="rgba(255,255,255,0.14)" stroke="#94a3b8" strokeWidth="2" />
        <rect x="14" y={202 - fill} width="10" height={fill} fill={inst.color} opacity={inst.volume > 0 ? 0.84 : 0} style={{ mixBlendMode: 'multiply', transition: 'fill 280ms ease, opacity 280ms ease' }} />
        {inst.volume > 0 && (
          <motion.rect
            x="15"
            y={Math.max(8, 204 - fill)}
            width="8"
            height="10"
            rx="4"
            fill="rgba(255,255,255,0.34)"
            animate={{ y: [Math.max(8, 204 - fill), Math.max(12, 198 - fill), Math.max(8, 204 - fill)] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
        )}
        {Array.from({ length: 21 }).map((_, i) => {
          const y = 12 + i * 9;
          const isMajor = i % 5 === 0;
          return (
            <g key={i}>
              <line x1="13" x2={isMajor ? 24 : 20} y1={y} y2={y} stroke="#94a3b8" strokeWidth="1" />
              {isMajor && <text x="2" y={y + 3} fill="#64748b" fontSize="6">{i}</text>}
            </g>
          );
        })}
        <rect x="7" y="205" width="24" height="7" rx="3" fill="#334155" />
        <circle cx="19" cy="208.5" r="1.7" fill="#cbd5e1" />
        <polygon points="14,214 24,214 20,244 18,244" fill="rgba(255,255,255,0.14)" stroke="#94a3b8" strokeWidth="2" />
      </svg>
    );
  },
  pipette: ({ inst, active }) => {
    const fill = (inst.volume / Math.max(1, inst.capacity)) * 78;
    return (
      <svg width="32" height="176" viewBox="0 0 32 176" className={active ? 'drop-shadow-[0_0_14px_rgba(14,165,233,0.7)]' : ''}>
        <rect x="14" y="4" width="4" height="24" fill="rgba(255,255,255,0.12)" stroke="#94a3b8" strokeWidth="2" />
        <ellipse cx="16" cy="48" rx="12" ry="26" fill="rgba(255,255,255,0.12)" stroke="#94a3b8" strokeWidth="2" />
        <rect x="14" y="74" width="4" height="72" fill="rgba(255,255,255,0.12)" stroke="#94a3b8" strokeWidth="2" />
        <polygon points="14,146 18,146 17,176 15,176" fill="rgba(255,255,255,0.12)" stroke="#94a3b8" strokeWidth="2" />
        <rect x="15" y={146 - fill} width="2" height={fill} fill={inst.color} opacity={inst.volume > 0 ? 0.84 : 0} style={{ transition: 'fill 280ms ease, opacity 280ms ease' }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1="18" x2="22" y1={82 + i * 8} y2={82 + i * 8} stroke="#94a3b8" strokeWidth="1" />
        ))}
      </svg>
    );
  },
  bunsen_burner: ({ inst, active }) => (
    <svg width="68" height="98" viewBox="0 0 68 98" className={active ? 'drop-shadow-[0_0_14px_rgba(251,146,60,0.8)]' : ''}>
      <rect x="8" y="78" width="52" height="14" rx="4" fill="#334155" />
      <rect x="29" y="30" width="10" height="48" fill="#94a3b8" />
      <rect x="23" y="50" width="22" height="6" fill="#facc15" />
      {inst.value > 0 && (
        <motion.path
          d="M 34 8 Q 48 24 34 40 Q 20 24 34 8"
          fill="rgba(249,115,22,0.88)"
          animate={{ opacity: [0.55, 1, 0.6], scale: [0.95, 1.05, 0.98] }}
          transition={{ repeat: Infinity, duration: 0.9 }}
        />
      )}
    </svg>
  ),
  test_tube: ({ inst, active }) => {
    const clipId = `tt-${inst.uid}`;
    const fill = (inst.volume / Math.max(1, inst.capacity)) * 98;
    return (
      <svg width="36" height="110" viewBox="0 0 36 110" className={active ? 'drop-shadow-[0_0_14px_rgba(14,165,233,0.7)]' : ''}>
        <path d="M 7 4 L 7 92 Q 7 108 18 108 Q 29 108 29 92 L 29 4" fill="rgba(255,255,255,0.12)" stroke="#94a3b8" strokeWidth="2" />
        <g clipPath={`url(#${clipId})`}>
          <rect x="7" y={108 - fill} width="22" height={fill} fill={inst.color} opacity={inst.volume > 0 ? 0.84 : 0} style={{ mixBlendMode: 'multiply', transition: 'fill 280ms ease, opacity 280ms ease' }} />
          {inst.volume > 0 && (
            <motion.ellipse
              cx="18"
              cy={Math.max(10, 106 - fill)}
              rx="8"
              ry="3"
              fill="rgba(255,255,255,0.34)"
              animate={{ cx: [18, 20, 18] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            />
          )}
        </g>
        <path d="M 13 8 Q 15 32 12 82" stroke="rgba(255,255,255,0.38)" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <clipPath id={clipId}>
            <path d="M 7 4 L 7 92 Q 7 108 18 108 Q 29 108 29 92 L 29 4" />
          </clipPath>
        </defs>
      </svg>
    );
  },
  magnetic_stirrer: ({ inst }) => (
    <div className={`w-[90px] h-[36px] rounded-md bg-slate-300 border-2 border-slate-500 shadow-md flex items-center justify-center ${inst.value > 0 ? 'ring-2 ring-cyan-400/70' : ''}`}>
      <ChevronsDown className={`w-5 h-5 text-slate-800 ${inst.value > 0 ? 'animate-spin' : ''}`} />
    </div>
  ),
  ph_meter: ({ reading }) => (
    <div className="w-[64px] h-[86px] bg-slate-700 border border-slate-500 rounded-md relative flex flex-col items-center p-1 shadow-sm">
      <div className="w-full bg-black text-cyan-400 font-mono text-center text-[11px] rounded border border-white/20 mb-1">{Number(reading || 7).toFixed(2)}</div>
      <ThermometerSun className="w-6 h-6 text-white" />
      <div className="absolute top-[86px] left-1/2 -translate-x-1/2 w-2 h-[80px] bg-slate-300 rounded-b" />
    </div>
  ),
  conductivity_meter: ({ reading }) => (
    <div className="w-[72px] h-[92px] bg-slate-800 border border-slate-500 rounded-md relative flex flex-col items-center p-1 shadow-sm">
      <div className="w-full bg-black text-emerald-300 font-mono text-center text-[10px] rounded border border-white/20 mb-1">{Number(reading || 0).toFixed(2)}</div>
      <div className="text-[9px] uppercase tracking-wide text-slate-200 font-bold">mS/cm</div>
      <div className="mt-2 w-7 h-7 rounded-full border border-emerald-300/50 bg-emerald-400/10" />
      <div className="absolute top-[92px] left-1/2 -translate-x-1/2 w-2 h-[76px] bg-slate-300 rounded-b" />
    </div>
  ),
  thermometer: ({ reading }) => (
    <div className="w-[50px] h-[120px] rounded-xl border border-slate-300 bg-white shadow-sm relative flex items-end justify-center pb-2">
      <div className="w-3 h-20 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
        <div className="w-full bg-rose-500" style={{ height: `${Math.max(10, Math.min(100, ((reading || 25) / 100) * 100))}%` }} />
      </div>
      <div className="absolute -bottom-6 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1">
        {Number(reading || 25).toFixed(0)} C
      </div>
    </div>
  ),
  dropper: ({ inst, active }) => (
    <svg width="36" height="110" viewBox="0 0 36 110" className={active ? 'drop-shadow-[0_0_14px_rgba(14,165,233,0.7)]' : ''}>
      <ellipse cx="18" cy="18" rx="12" ry="10" fill="#64748b" />
      <rect x="14" y="24" width="8" height="54" rx="4" fill="rgba(255,255,255,0.12)" stroke="#94a3b8" strokeWidth="2" />
      <polygon points="14,78 22,78 19,110 17,110" fill="rgba(255,255,255,0.12)" stroke="#94a3b8" strokeWidth="2" />
      <rect x="15" y={78 - (inst.volume / Math.max(1, inst.capacity)) * 52} width="6" height={(inst.volume / Math.max(1, inst.capacity)) * 52} fill={inst.color} opacity={inst.volume > 0 ? 0.84 : 0} style={{ transition: 'fill 280ms ease, opacity 280ms ease' }} />
    </svg>
  ),
  stand_clamp: () => (
    <svg width="80" height="130" viewBox="0 0 80 130">
      <rect x="8" y="114" width="64" height="10" rx="3" fill="#334155" />
      <rect x="38" y="20" width="4" height="94" fill="#94a3b8" />
      <rect x="42" y="44" width="20" height="4" rx="2" fill="#64748b" />
      <circle cx="60" cy="46" r="4" fill="#475569" />
    </svg>
  )
};

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getInstrumentFootprint(type) {
  switch (type) {
    case 'burette':
      return { width: 56, height: 272 };
    case 'pipette':
      return { width: 52, height: 188 };
    case 'beaker':
    case 'conical_flask':
      return { width: 112, height: 132 };
    case 'test_tube':
      return { width: 56, height: 124 };
    case 'bunsen_burner':
      return { width: 86, height: 108 };
    case 'stand_clamp':
      return { width: 96, height: 140 };
    case 'thermometer':
      return { width: 72, height: 148 };
    case 'ph_meter':
    case 'conductivity_meter':
      return { width: 88, height: 176 };
    case 'magnetic_stirrer':
      return { width: 110, height: 60 };
    default:
      return { width: 76, height: 120 };
  }
}

function getSpawnPosition(type, count, workspaceRect) {
  const width = workspaceRect?.width || 920;
  const rightAnchor = Math.max(560, width - 170);
  const map = {
    stand_clamp: { x: rightAnchor - 28, y: 56 },
    burette: { x: rightAnchor, y: 28 },
    conductivity_meter: { x: rightAnchor + 118, y: 168 },
    ph_meter: { x: rightAnchor + 42, y: 162 },
    thermometer: { x: rightAnchor + 82, y: 168 },
    test_tube: { x: rightAnchor + 108, y: 292 },
    dropper: { x: rightAnchor + 136, y: 118 },
    conical_flask: { x: 360, y: 286 },
    beaker: { x: 220, y: 286 },
    magnetic_stirrer: { x: 356, y: 404 },
    bunsen_burner: { x: 218, y: 400 },
    pipette: { x: 190, y: 118 }
  };

  const base = map[type] || { x: 160 + (count % 5) * 64, y: 120 + Math.floor(count / 5) * 48 };
  return {
    x: base.x + (type === 'burette' || type === 'stand_clamp' ? 0 : 0),
    y: base.y + (type === 'burette' ? count * 6 : type === 'stand_clamp' ? count * 8 : 0)
  };
}

export default function WorkspacePanel({
  theme = 'dark',
  reagentVolume = 10,
  reagentConcentration = 0,
  reagentNormality = 0.1,
  onAddReading,
  onSimulationEvent,
  initialWorkspaceState,
  onWorkspaceStateChange
}) {
  const workspaceRef = useRef(null);
  const instancesRef = useRef([]);
  const dragStateRef = useRef(null);
  const snapTimeoutRef = useRef(null);
  const [instances, setInstances] = useState([]);
  const [dragActiveId, setDragActiveId] = useState(null);
  const [meterValue, setMeterValue] = useState(7);
  const [conductivityValue, setConductivityValue] = useState(0.05);
  const [thermometerValue, setThermometerValue] = useState(25);
  const [activeBuretteUid, setActiveBuretteUid] = useState(null);
  const [flowStep, setFlowStep] = useState(0.5);
  const [isFlowing, setIsFlowing] = useState(false);
  const [reactionFx, setReactionFx] = useState({});
  const [snapMessage, setSnapMessage] = useState('');

  useEffect(() => {
    instancesRef.current = instances;
  }, [instances]);

  useEffect(() => {
    if (initialWorkspaceState?.instances && Array.isArray(initialWorkspaceState.instances)) {
      setInstances(initialWorkspaceState.instances.map((inst) => ({
        rotation: 0,
        tempC: 25,
        ...inst
      })));
      if (Number.isFinite(initialWorkspaceState?.meterValue)) setMeterValue(initialWorkspaceState.meterValue);
      if (Number.isFinite(initialWorkspaceState?.conductivityValue)) setConductivityValue(initialWorkspaceState.conductivityValue);
      setThermometerValue(25);
    }
  }, [initialWorkspaceState]);

  useEffect(() => {
    onWorkspaceStateChange?.({ instances, meterValue, conductivityValue });
  }, [instances, meterValue, conductivityValue, onWorkspaceStateChange]);

  useEffect(() => () => {
    if (snapTimeoutRef.current) window.clearTimeout(snapTimeoutRef.current);
  }, []);

  useEffect(() => {
    const handleSpawn = (e) => {
      const type = e?.detail?.type;
      if (!type || !Object.prototype.hasOwnProperty.call(CAPS, type)) return;
      const uid = `${Date.now()}${Math.random().toString().slice(2, 7)}`;
      setInstances((prev) => {
        const idx = prev.filter((item) => item.type === type).length;
        const workspaceRect = workspaceRef.current?.getBoundingClientRect();
        const spawn = getSpawnPosition(type, idx, workspaceRect);
        const next = {
          uid,
          type,
          volume: 0,
          capacity: CAPS[type] || 0,
          x: spawn.x,
          y: spawn.y,
          rotation: 0,
          reagents: [],
          composition: {},
          color: '#ffffff',
          ph: 7,
          conductivity: 0.05,
          value: type === 'bunsen_burner' ? 1 : 0,
          drips: 0,
          tempC: 25
        };
        return [...prev, next];
      });
      if (type === 'burette') {
        setActiveBuretteUid((prev) => prev || uid);
      }
    };

    const handleReset = () => {
      setInstances([]);
      setIsFlowing(false);
      setReactionFx({});
      setMeterValue(7);
      setConductivityValue(0.05);
      setThermometerValue(25);
      setActiveBuretteUid(null);
    };

    window.addEventListener('spawn-instrument', handleSpawn);
    window.addEventListener('reset-instruments', handleReset);
    return () => {
      window.removeEventListener('spawn-instrument', handleSpawn);
      window.removeEventListener('reset-instruments', handleReset);
    };
  }, []);

  useEffect(() => {
    const vessels = instances.filter((item) => vesselTypes.has(item.type) && item.capacity > 0 && item.volume > 0);
    const phProbe = instances.find((item) => item.type === 'ph_meter');
    const conductivityProbe = instances.find((item) => item.type === 'conductivity_meter');
    const thermometerProbe = instances.find((item) => item.type === 'thermometer');
    const phSample = getProbeSample(phProbe, vessels);
    const conductivitySample = getProbeSample(conductivityProbe, vessels);
    const thermometerSample = getProbeSample(thermometerProbe, vessels);

    setMeterValue(phSample ? Number(phSample.vessel.ph.toFixed(2)) : 7);
    setConductivityValue(conductivitySample ? Number((conductivitySample.vessel.conductivity ?? 0.05).toFixed(2)) : 0.05);
    setThermometerValue(thermometerSample ? Number((thermometerSample.vessel.tempC || 25).toFixed(0)) : 25);
  }, [instances]);

  useEffect(() => {
    const interval = setInterval(() => {
      setInstances((prev) => {
        const burner = prev.find((i) => i.type === 'bunsen_burner' && i.value > 0);
        if (!burner) return prev;

        return prev.map((inst) => {
          if (!vesselTypes.has(inst.type) || inst.capacity <= 0) return inst;
          const near = Math.abs(inst.x - burner.x) < 70 && inst.y < burner.y && burner.y - inst.y < 220;
          if (!near) return inst;
          return { ...inst, tempC: Math.min(90, (inst.tempC || 25) + 0.3) };
        });
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isFlowing || !activeBuretteUid) return;

    const interval = setInterval(() => {
      setInstances((prev) => {
        const burette = prev.find((i) => i.uid === activeBuretteUid && i.type === 'burette');
        if (!burette || burette.volume <= 0) {
          setIsFlowing(false);
          return prev;
        }

        const target = prev
          .filter((i) => i.uid !== burette.uid && vesselTypes.has(i.type) && i.capacity > 0)
          .find((i) => Math.abs(i.x - burette.x) < 64 && i.y > burette.y && i.y < burette.y + 320);

        if (!target) return prev;

        const transfer = Math.min(flowStep, burette.volume, target.capacity - target.volume);
        if (transfer <= 0) return prev;

        const buretteRatio = transfer / Math.max(burette.volume, 0.001);
        const movedComposition = scaleComposition(burette.composition || {}, buretteRatio);
        const targetComposition = mergeComposition(target.composition || {}, movedComposition);
        const mixedTempC = (((target.tempC || 25) * target.volume) + ((burette.tempC || 25) * transfer)) / Math.max(0.001, target.volume + transfer);
        const targetMetrics = deriveSolutionMetrics(target.volume + transfer, targetComposition, [...target.reagents, ...Object.keys(movedComposition)], mixedTempC);

        const acidPresent = targetMetrics.reagents.includes('hcl') || targetMetrics.reagents.includes('h2so4') || targetMetrics.reagents.includes('hno3');
        const basePresent = targetMetrics.reagents.includes('naoh') || targetMetrics.reagents.includes('koh');
        const hardnessSetup =
          targetMetrics.reagents.includes('ebt') &&
          targetMetrics.reagents.includes('ammonia_buffer') &&
          (targetMetrics.reagents.includes('tap_water') || targetMetrics.reagents.includes('river_water'));
        const endpointCrossed = hardnessSetup && !target.endpointReached && targetMetrics.endpointReached;
        if (acidPresent && basePresent) {
          setReactionFx((fx) => ({
            ...fx,
            [target.uid]: { text: 'Neutralization: HCl + NaOH -> NaCl + H2O', ts: Date.now() }
          }));
          onSimulationEvent?.({
            hasReaction: true,
            autoObservation: 'Neutralization observed with visible color shift and bubbles.',
            aiExplanation: 'Titrate slowly near endpoint; stop at light pink with phenolphthalein.'
          });
          setTimeout(() => {
            setReactionFx((fx) => {
              const next = { ...fx };
              delete next[target.uid];
              return next;
            });
          }, 1200);
        } else if (endpointCrossed) {
          setReactionFx((fx) => ({
            ...fx,
            [target.uid]: { text: 'Hardness endpoint: EBT wine-red -> blue with EDTA', ts: Date.now() }
          }));
          onSimulationEvent?.({
            hasReaction: true,
            autoObservation: 'Complexometric endpoint reached. The hard-water sample changed from wine red to blue.',
            aiExplanation: 'Endpoint reached. Stop the EDTA flow and record the burette reading for hardness calculation.'
          });
          setTimeout(() => {
            setReactionFx((fx) => {
              const next = { ...fx };
              delete next[target.uid];
              return next;
            });
          }, 1400);
        }

        return prev.map((inst) => {
          if (inst.uid === burette.uid) {
            const buretteRemainingComposition = mergeComposition(inst.composition || {}, scaleComposition(movedComposition, -1));
            const buretteMetrics = deriveSolutionMetrics(inst.volume - transfer, buretteRemainingComposition, Object.keys(buretteRemainingComposition), inst.tempC || 25);
            return { ...inst, ...buretteMetrics, drips: (inst.drips || 0) + 1 };
          }
          if (inst.uid === target.uid) {
            return {
              ...inst,
              ...targetMetrics,
              tempC: acidPresent && basePresent ? Math.min(90, targetMetrics.tempC + 1.8) : targetMetrics.tempC
            };
          }
          return inst;
        });
      });
    }, 320);

    return () => clearInterval(interval);
  }, [activeBuretteUid, flowStep, isFlowing, onSimulationEvent]);

  const handleDropPayload = (e, targetUid) => {
    e.preventDefault();
    const reagentId = e.dataTransfer.getData('reagent');
    if (!reagentId) return;

    let targetType = 'vessel';

    setInstances((prev) => prev.map((inst) => {
      if (inst.uid !== targetUid || inst.capacity <= 0) return inst;

      targetType = inst.type;
      const chem = CHEMICALS[reagentId] || CHEMICALS.water;
      const add = chem.indicator ? Math.min(2, reagentVolume) : Math.max(0.1, reagentVolume);
      const newVol = Math.min(inst.capacity, inst.volume + add);
      const addVol = newVol - inst.volume;
      const rawConcentration = e.dataTransfer.getData('concentration');
      const rawNormality = e.dataTransfer.getData('normality');
      const parsedConcentration = rawConcentration === '' ? NaN : Number(rawConcentration);
      const parsedNormality = rawNormality === '' ? NaN : Number(rawNormality);
      const fallbackConcentration = Number.isFinite(reagentConcentration)
        ? reagentConcentration
        : (Number.isFinite(chem.molarity) ? chem.molarity : 0.1);
      const fallbackNormality = Number.isFinite(reagentNormality) ? reagentNormality : NaN;
      const baseConcentration = Number.isFinite(parsedConcentration) ? parsedConcentration : fallbackConcentration;
      const normalityValue = Number.isFinite(parsedNormality) ? parsedNormality : fallbackNormality;
      const concentrationFromNormality = resolveMolarityFromNormality(chem, normalityValue, baseConcentration);
      const selectedConcentration = chem.indicator
        ? 0.001
        : (reagentId === 'water' ? 0 : concentrationFromNormality);
      const addedMoles = (addVol / 1000) * selectedConcentration;
      const composition = mergeComposition(inst.composition || {}, { [reagentId]: addedMoles });
      const metrics = deriveSolutionMetrics(newVol, composition, [...inst.reagents, reagentId], inst.tempC || 25);

      return {
        ...inst,
        ...metrics
      };
    }));

    onSimulationEvent?.({
      autoObservation: `${CHEMICALS[reagentId]?.name || reagentId} added to ${targetType.replace(/_/g, ' ')}.`,
      aiExplanation: `${CHEMICALS[reagentId]?.name || reagentId} was dispensed at ${Number(reagentVolume).toFixed(reagentVolume < 1 ? 1 : 0)} mL. Confirm the vessel color and reading before the next step.`
    });

    soundManager.play('pour');
  };

  const transferBetween = (fromUid, toUid, maxTransfer = 10) => {
    if (fromUid === toUid) return;
    setInstances((prev) => {
      const from = prev.find((i) => i.uid === fromUid);
      const to = prev.find((i) => i.uid === toUid);
      if (!from || !to) return prev;
      if (from.capacity <= 0 || to.capacity <= 0) return prev;
      if (from.volume <= 0 || to.volume >= to.capacity) return prev;

      const amount = Math.min(maxTransfer, from.volume, to.capacity - to.volume);
      const transferRatio = amount / Math.max(from.volume, 0.001);
      const movedComposition = scaleComposition(from.composition || {}, transferRatio);
      const nextFromComposition = mergeComposition(from.composition || {}, scaleComposition(movedComposition, -1));
      const nextToComposition = mergeComposition(to.composition || {}, movedComposition);
      const nextFromMetrics = deriveSolutionMetrics(from.volume - amount, nextFromComposition, Object.keys(nextFromComposition), from.tempC || 25);
      const nextToMetrics = deriveSolutionMetrics(
        to.volume + amount,
        nextToComposition,
        [...to.reagents, ...Object.keys(movedComposition)],
        (((to.tempC || 25) * to.volume) + ((from.tempC || 25) * amount)) / Math.max(0.001, to.volume + amount)
      );

      return prev.map((inst) => {
        if (inst.uid === fromUid) return { ...inst, ...nextFromMetrics };
        if (inst.uid === toUid) {
          return {
            ...inst,
            ...nextToMetrics
          };
        }
        return inst;
      });
    });

    soundManager.play('pour');
  };

  const showSnapMessage = (message) => {
    if (snapTimeoutRef.current) window.clearTimeout(snapTimeoutRef.current);
    setSnapMessage(message);
    snapTimeoutRef.current = window.setTimeout(() => setSnapMessage(''), 1600);
  };

  const tryTransferAtPosition = (fromUid, x, y) => {
    const from = instancesRef.current.find((i) => i.uid === fromUid);
    if (!from || from.capacity <= 0) return;

    const targets = instancesRef.current
      .filter((i) => i.uid !== fromUid && i.capacity > 0)
      .map((i) => ({ ...i, d: distance({ x, y }, i) }))
      .filter((i) => i.d < 90)
      .sort((a, b) => a.d - b.d);

    if (!targets.length) return;
    transferBetween(fromUid, targets[0].uid);
  };

  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      const drag = dragStateRef.current;
      if (drag) {
        setInstances((prev) => prev.map((inst) => {
          if (inst.uid !== drag.uid) return inst;

          const nextX = Math.abs(drag.targetX - inst.x) < 0.4 ? drag.targetX : inst.x + (drag.targetX - inst.x) * 0.18;
          const nextY = Math.abs(drag.targetY - inst.y) < 0.4 ? drag.targetY : inst.y + (drag.targetY - inst.y) * 0.18;

          if (nextX === inst.x && nextY === inst.y) return inst;
          return { ...inst, x: nextX, y: nextY };
        }));
      }

      frameId = window.requestAnimationFrame(tick);
    };

    const handlePointerMove = (event) => {
      const drag = dragStateRef.current;
      const workspaceRect = workspaceRef.current?.getBoundingClientRect();
      if (!drag || !workspaceRect || event.pointerId !== drag.pointerId) return;

      event.preventDefault();
      drag.targetX = clamp(event.clientX - workspaceRect.left - drag.offsetX, 0, drag.maxX);
      drag.targetY = clamp(event.clientY - workspaceRect.top - drag.offsetY, 0, drag.maxY);
    };

    const handlePointerUp = (event) => {
      const drag = dragStateRef.current;
      if (!drag || (event.pointerId && drag.pointerId !== event.pointerId)) return;

      dragStateRef.current = null;
      setDragActiveId(null);

      const currentInstances = instancesRef.current;
      const inst = currentInstances.find((item) => item.uid === drag.uid);
      if (!inst) return;

      const snap = getSnapTarget(inst, currentInstances, drag.targetX, drag.targetY);
      const nextX = snap?.x ?? drag.targetX;
      const nextY = snap?.y ?? drag.targetY;

      setInstances((prev) => prev.map((item) => (
        item.uid === drag.uid ? { ...item, x: nextX, y: nextY } : item
      )));

      if (snap) showSnapMessage(snap.label);
      tryTransferAtPosition(drag.uid, nextX, nextY);
    };

    frameId = window.requestAnimationFrame(tick);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  const activeBurette = useMemo(
    () => instances.find((i) => i.uid === activeBuretteUid && i.type === 'burette') || null,
    [instances, activeBuretteUid]
  );

  const restoreInitialWorkspace = () => {
    if (initialWorkspaceState?.instances && Array.isArray(initialWorkspaceState.instances)) {
      setInstances(initialWorkspaceState.instances.map((inst) => ({
        rotation: 0,
        tempC: 25,
        ...inst
      })));
      setMeterValue(Number.isFinite(initialWorkspaceState?.meterValue) ? initialWorkspaceState.meterValue : 7);
      setConductivityValue(Number.isFinite(initialWorkspaceState?.conductivityValue) ? initialWorkspaceState.conductivityValue : 0.05);
    } else {
      setInstances([]);
      setMeterValue(7);
      setConductivityValue(0.05);
    }
    setThermometerValue(25);
    setIsFlowing(false);
    setReactionFx({});
    setActiveBuretteUid(null);
  };

  const rotateInstrument = (uid) => {
    setInstances((prev) => prev.map((inst) => (
      inst.uid === uid ? { ...inst, rotation: ((inst.rotation || 0) + 15) % 360 } : inst
    )));
  };

  const removeInstrument = (uid) => {
    setInstances((prev) => prev.filter((inst) => inst.uid !== uid));
    if (uid === activeBuretteUid) {
      setActiveBuretteUid(null);
      setIsFlowing(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden"
      ref={workspaceRef}
      style={{
        background: theme === 'dark'
          ? 'linear-gradient(180deg, rgba(4,17,31,0.98), rgba(10,26,44,0.94))'
          : 'linear-gradient(180deg, rgba(236,244,255,0.98), rgba(219,232,250,0.94))'
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: theme === 'dark'
            ? 'radial-gradient(circle at 20% 10%, rgba(77,164,255,0.18), transparent 36%), linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)'
            : 'radial-gradient(circle at 20% 10%, rgba(59,130,246,0.16), transparent 36%), linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px)',
          backgroundSize: 'auto, 42px 42px, 42px 42px'
        }}
      />
      <div className={`absolute inset-x-0 bottom-0 h-44 ${theme === 'dark' ? 'bg-gradient-to-t from-slate-900/80 to-transparent' : 'bg-gradient-to-t from-slate-300 to-transparent'}`} />
      <motion.div
        className="absolute inset-x-16 top-10 h-24 rounded-full blur-3xl"
        animate={{ opacity: theme === 'dark' ? [0.15, 0.24, 0.17] : [0.11, 0.18, 0.12] }}
        transition={{ repeat: Infinity, duration: 5.4 }}
        style={{ background: theme === 'dark' ? 'rgba(113,247,255,0.2)' : 'rgba(59,130,246,0.14)' }}
      />

      <div className={`absolute top-4 left-4 z-40 p-3 rounded-xl border shadow-sm w-[320px] ${theme === 'dark' ? 'bg-slate-950/88 border-slate-700 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-900'}`}>
        <h3 className={`text-xs font-black uppercase tracking-wide ${theme === 'dark' ? 'text-cyan-200' : 'text-slate-700'}`}>Lab Workspace</h3>
        <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>Drag with soft placement, drop reagents into vessels, and move apparatus near holders to snap into alignment.</p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className={`rounded-md px-2 py-1 border ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>pH meter: <span className={theme === 'dark' ? 'font-bold text-cyan-200' : 'font-bold text-slate-800'}>{meterValue.toFixed(2)}</span></div>
          <div className={`rounded-md px-2 py-1 border ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>Cond.: <span className={theme === 'dark' ? 'font-bold text-emerald-200' : 'font-bold text-slate-800'}>{conductivityValue.toFixed(2)} mS/cm</span></div>
          <div className={`rounded-md px-2 py-1 border ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>Temp: <span className={theme === 'dark' ? 'font-bold text-orange-200' : 'font-bold text-slate-800'}>{thermometerValue.toFixed(0)} C</span></div>
        </div>

        <div className={`mt-2 rounded-md px-2 py-1 border text-[10px] ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
          Reagent add volume: <span className="font-bold">{Number(reagentVolume).toFixed(reagentVolume < 1 ? 1 : 0)} mL</span>
        </div>

        <div className={`mt-2 rounded-md px-2 py-1 border text-[10px] ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
          Reagent concentration: <span className="font-bold">{Number(reagentConcentration).toFixed(reagentConcentration < 0.1 ? 2 : 1)} M</span>
        </div>

        <div className={`mt-2 rounded-md px-2 py-1 border text-[10px] ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
          Reagent normality: <span className="font-bold">{Number(reagentNormality).toFixed(reagentNormality < 0.1 ? 2 : 1)} N</span>
        </div>

        {snapMessage && (
          <div className={`mt-2 rounded-md px-2 py-1 border text-[10px] ${theme === 'dark' ? 'bg-cyan-950/70 border-cyan-800 text-cyan-100' : 'bg-cyan-50 border-cyan-200 text-cyan-800'}`}>
            {snapMessage}
          </div>
        )}

        {activeBurette && (
          <div className="mt-3 p-2 rounded-lg border border-cyan-200 bg-cyan-50/70">
            <p className="text-[10px] font-black uppercase text-cyan-700">Burette Control</p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-700">
              <span>Select volume</span>
              <span className="font-black">{flowStep.toFixed(1)} ml</span>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {FLOW_STEPS.map((step) => (
                <button
                  key={step}
                  onClick={() => setFlowStep(step)}
                  className={`text-[9px] px-1 py-0.5 rounded border ${flowStep === step ? 'bg-cyan-600 text-white border-cyan-700' : 'bg-white text-slate-700 border-slate-200'}`}
                >
                  {step} ml
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0"
              max={FLOW_STEPS.length - 1}
              value={Math.max(0, FLOW_STEPS.indexOf(flowStep))}
              onChange={(e) => setFlowStep(FLOW_STEPS[Number(e.target.value)] || 0.5)}
              className="w-full mt-1"
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button onClick={() => setIsFlowing(true)} className="text-[11px] py-1 rounded bg-emerald-600 text-white font-bold">Start Flow</button>
              <button onClick={() => setIsFlowing(false)} className="text-[11px] py-1 rounded bg-rose-600 text-white font-bold">Stop Flow</button>
              <button
                onClick={() => {
                  setIsFlowing(false);
                  setInstances((prev) => prev.map((inst) => {
                    if (inst.uid !== activeBurette.uid) return inst;
                    const buretteReagents = inst.reagents.length ? inst.reagents : ['naoh'];
                    const composition = Object.fromEntries(
                      buretteReagents
                        .filter((id) => !CHEMICALS[id]?.indicator)
                        .map((id) => [id, (inst.capacity / 1000) * getSolutionStrength(inst, id)])
                    );
                    const metrics = deriveSolutionMetrics(inst.capacity, composition, buretteReagents, inst.tempC || 25);
                    return { ...inst, ...metrics, drips: 0 };
                  }));
                }}
                className="text-[11px] py-1 rounded bg-slate-700 text-white font-bold"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              const burette = instances.find((i) => i.type === 'burette');
              const volume = burette ? (burette.capacity - burette.volume).toFixed(2) : '0.00';
              onAddReading?.({ volumeUsed: volume, ph: meterValue.toFixed(2), conductivity: conductivityValue.toFixed(2) });
              soundManager.play('clink');
            }}
            className="text-[10px] bg-cyan-600 text-white font-bold px-2 py-1 rounded"
          >
            Log Reading
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('reset-instruments'))} className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded">Clear Lab</button>
          <button onClick={restoreInitialWorkspace} className="text-[10px] bg-slate-700 text-white font-bold px-2 py-1 rounded">Reload Setup</button>
        </div>
      </div>

      <AnimatePresence>
        {instances.map((inst) => {
          const Comp = Instruments2D[inst.type];
          if (!Comp) return null;

          return (
            <motion.div
              key={inst.uid}
              onPointerDown={(event) => {
                if (event.button !== 0 || !workspaceRef.current) return;
                if (event.target.closest('button')) return;

                const workspaceRect = workspaceRef.current.getBoundingClientRect();
                const footprint = getInstrumentFootprint(inst.type);
                dragStateRef.current = {
                  uid: inst.uid,
                  pointerId: event.pointerId,
                  offsetX: event.clientX - workspaceRect.left - inst.x,
                  offsetY: event.clientY - workspaceRect.top - inst.y,
                  maxX: Math.max(0, workspaceRect.width - footprint.width),
                  maxY: Math.max(0, workspaceRect.height - footprint.height),
                  targetX: inst.x,
                  targetY: inst.y
                };
                setDragActiveId(inst.uid);
                event.currentTarget.setPointerCapture?.(event.pointerId);
                event.preventDefault();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => handleDropPayload(e, inst.uid)}
              onClick={() => {
                if (inst.type === 'burette') setActiveBuretteUid(inst.uid);
                if (inst.type === 'bunsen_burner') {
                  setInstances((prev) => prev.map((i) => (
                    i.uid === inst.uid ? { ...i, value: i.value > 0 ? 0 : 1 } : i
                  )));
                }
                if (inst.type === 'magnetic_stirrer') {
                  setInstances((prev) => prev.map((i) => (
                    i.uid === inst.uid ? { ...i, value: i.value > 0 ? 0 : 1 } : i
                  )));
                }
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: dragActiveId === inst.uid ? 1.03 : 1, zIndex: dragActiveId === inst.uid ? 60 : 20 }}
              exit={{ opacity: 0, scale: 0.85 }}
              style={{ position: 'absolute', left: inst.x, top: inst.y, transform: `rotate(${inst.rotation || 0}deg)` }}
              className="cursor-grab active:cursor-grabbing select-none group/instrument flex flex-col items-center"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/instrument:opacity-100 flex gap-1 transition-opacity">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    rotateInstrument(inst.uid);
                  }}
                  className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50"
                  title="Rotate"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeInstrument(inst.uid);
                  }}
                  className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-rose-600 hover:bg-rose-50"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="relative">
                {(inst.type === 'conical_flask' || inst.type === 'beaker' || inst.type === 'test_tube') && inst.volume > 0 && (
                  <motion.div
                    className="absolute inset-x-3 bottom-6 h-3 rounded-full blur-sm"
                    animate={{ opacity: [0.18, 0.34, 0.18] }}
                    transition={{ repeat: Infinity, duration: 2.4 }}
                    style={{ background: inst.color }}
                  />
                )}
                <Comp inst={inst} active={dragActiveId === inst.uid} reading={inst.type === 'ph_meter' ? meterValue : inst.type === 'conductivity_meter' ? conductivityValue : inst.type === 'thermometer' ? thermometerValue : undefined} />
              </div>

              {inst.type === 'burette' && isFlowing && activeBuretteUid === inst.uid && (inst.drips || 0) % 2 !== 0 && (
                <motion.div
                  animate={{ y: [0, 86], opacity: [1, 0] }}
                  transition={{ duration: 0.28 }}
                  className="w-1.5 h-1.5 rounded-full z-20"
                  style={{ backgroundColor: inst.color, position: 'absolute', bottom: -6, left: 18 }}
                />
              )}

              {reactionFx[inst.uid] && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-4 text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                    {reactionFx[inst.uid].text}
                  </motion.div>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <motion.div
                      key={`${inst.uid}-bubble-${idx}`}
                      className="absolute w-2 h-2 rounded-full bg-white/80 border border-cyan-200"
                      initial={{ y: 0, x: idx * 5 - 10, opacity: 0.8 }}
                      animate={{ y: -36 - idx * 6, opacity: 0 }}
                      transition={{ duration: 0.8 + idx * 0.08 }}
                    />
                  ))}
                </>
              )}

              <div className="text-[10px] font-bold text-slate-700 mt-1 bg-white/80 px-2 py-0.5 rounded border border-slate-200 shadow-sm whitespace-nowrap">
                {inst.type.replace('_', ' ').toUpperCase()} {inst.capacity > 0 ? `(${inst.volume.toFixed(1)}ml)` : ''}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
