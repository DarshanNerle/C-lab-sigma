export interface LabInstance {
  uid: string;
  type: string;
  x: number;
  y: number;
  capacity: number;
  volume: number;
  color: string;
  ph: number;
  reagents: string[];
  rotation: number;
  value: number;
  drips: number;
  tempC: number;
}

export interface Experiment {
  id: string;
  title: string;
  description: string;
  aim: string;
  theory: string;
  apparatus: string[];
  chemicals: string[];
  procedure: string[];
  formula: string;
  difficulty: string;
  time: string;
  calculations: {
    knowns: Record<string, number>;
  };
}

export interface LabReading {
  id: string;
  trial: number;
  initialReading: string;
  finalReading: string;
  volumeUsed: string;
  ph: string;
  conductivity: string;
}
