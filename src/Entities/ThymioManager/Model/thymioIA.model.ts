import { Observable } from '../../../helpers';
import * as tf from '@tensorflow/tfjs';
export interface DataEntry {
  input: string[];
  output: string;
}

interface IThymioIA {
  
  captors: Observable<{ [uuid: string]: number[] }>;
  getRobotsUuids: () => Promise<string[]>;
  takeControl: (uuid: string, onVariableChange?: (uuid: string, variables: { [name: string]: number }) => void) => void;
  predict: (uuid: string, input: string[]) => void;
  trainModel: (data: DataEntry[]) => Promise<void>;
  emitAction: (uuid: string, action: string, args: number[]) => Promise<void>;
  emitMotorEvent: (uuid: string, action: string) => Promise<void>;
  reinitializeModel: (inputMode: string)=> Promise<void>;
  getModel: () => Promise<tf.Sequential | null>;
}

export default IThymioIA;
