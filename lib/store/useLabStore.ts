import { create } from 'zustand';
import { LabInstance, Experiment, LabReading } from '../types';
import { APPARATUS_DEFAULTS } from '../constants';

interface LabState {
  instances: LabInstance[];
  readings: LabReading[];
  selectedExperiment: Experiment | null;
  meterValue: number;
  conductivityValue: number;
  workspaceVersion: number;
  
  // Actions
  setExperiment: (experiment: Experiment) => void;
  addInstance: (type: string, x?: number, y?: number) => void;
  removeInstance: (uid: string) => void;
  updateInstance: (uid: string, updates: Partial<LabInstance>) => void;
  addReading: (reading: LabReading) => void;
  clearReadings: () => void;
  resetLab: () => void;
  setMeterValue: (val: number) => void;
  setConductivityValue: (val: number) => void;
}

export const useLabStore = create<LabState>((set) => ({
  instances: [],
  readings: [],
  selectedExperiment: null,
  meterValue: 7,
  conductivityValue: 0.05,
  workspaceVersion: 1,

  setExperiment: (experiment) => set({ selectedExperiment: experiment }),

  addInstance: (type, x, y) => set((state) => {
    const preset = (APPARATUS_DEFAULTS as any)[type] || { x: 200, y: 200 };
    const capacity = 
      type === 'burette' ? 50 : 
      type === 'beaker' ? 250 : 
      type === 'conical_flask' ? 250 : 
      type === 'test_tube' ? 50 : 
      type === 'pipette' ? 25 : 
      type === 'dropper' ? 5 : 0;

    const newInstance: LabInstance = {
      uid: `${type}-${Date.now()}`,
      type,
      x: x ?? preset.x,
      y: y ?? preset.y,
      capacity,
      volume: preset.volume ?? 0,
      color: preset.color || '#ffffff',
      ph: preset.ph ?? 7,
      reagents: preset.reagents || [],
      rotation: 0,
      value: type === 'magnetic_stirrer' ? 1 : 0,
      drips: 0,
      tempC: 25,
    };

    return { instances: [...state.instances, newInstance] };
  }),

  removeInstance: (uid) => set((state) => ({
    instances: state.instances.filter((inst) => inst.uid !== uid)
  })),

  updateInstance: (uid, updates) => set((state) => ({
    instances: state.instances.map((inst) => 
      inst.uid === uid ? { ...inst, ...updates } : inst
    )
  })),

  addReading: (reading) => set((state) => ({
    readings: [...state.readings, reading]
  })),

  clearReadings: () => set({ readings: [] }),

  resetLab: () => set((state) => ({
    instances: [],
    readings: [],
    meterValue: 7,
    conductivityValue: 0.05,
    workspaceVersion: state.workspaceVersion + 1,
  })),

  setMeterValue: (meterValue) => set({ meterValue }),
  setConductivityValue: (conductivityValue) => set({ conductivityValue }),
}));
