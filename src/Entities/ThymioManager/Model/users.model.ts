import { Observable } from '../../../helpers';
import { DataEntry } from './thymioIA.model';
import * as tf from '@tensorflow/tfjs';

export type UsersType = 'AllUser' | 'Teacher' | 'Student' | 'Admin' | 'Dev';

export interface Users {
  captors: Observable<{ [uuid: string]: number[] }>;
  predict: (
    uuid: string,
    input: string[],
    inote: number,
    isWinnerTakesAll: boolean,
    inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY'
  ) => Promise<any>;
  trainModel: (data: DataEntry[], inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY') => Promise<any[] | undefined>;
  getRobotsUuids: () => Promise<string[]>;
  takeControl: (uuid: string, onVariableChange?: (uuid: string, variables: { [name: string]: number }) => void) => void;
  emitAction: (uuid: string, action: string, args: number[]) => Promise<void>;
  emitMotorEvent: (uuid: string, action: string) => Promise<void>;
  reinitializeModel: (inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY') => Promise<void>;
  getModel: () => Promise<tf.Sequential | null>;
}
