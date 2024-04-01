import { toJS } from 'mobx';
import { BoundedContext, Container, Observable, createObservable, subscribe } from '../../../helpers';
import { Activity, DataEntry, Robot, TdmController, Thymio } from '../Model';
import type IThymioIA from '../Model/thymioIA.model';
import * as tf from '@tensorflow/tfjs';

@BoundedContext({ key: 'ThymioIA', predicate: [] })
export class ThymioIA implements IThymioIA {
  private tdmController: TdmController;
  captors: Observable<{ [uuid: string]: number[] }> = createObservable({
    key: 'Thymios',
    initialValue: {},
  });

  model: tf.Sequential | null = null;

  actionMapping: Record<string, number> = {
    STOP: 0,
    FORWARD: 1,
    BACKWARD: 2,
    LEFT: 3,
    RIGHT: 4,
  };

  constructor({ activity, hosts }: { activity: Activity; hosts: string[] }) {
    const tdmController = Container.factoryFromInjectable<TdmController>('SERVICE', 'HostController', ['thymio2'], {
      hosts,
    });
    if (!tdmController) {
      throw new Error('SERVICE:ThymioDeviceManager not found');
    }
    this.tdmController = tdmController;
  }

  initModel = async () =>
    new Promise<tf.Sequential>((resolve, reject) => {
      try {
        // Inicializar el modelo
        const model = tf.sequential();

        // Ajustando la capa de entrada para que coincida con los datos de entrada reales ([9])
        model.add(tf.layers.dense({ units: 16, inputShape: [10], activation: 'relu' }));
        // Ajustar la capa de salida para que coincida con el número de acciones posibles (5)
        model.add(tf.layers.dense({ units: 5, activation: 'softmax' }));

        // Compilar el modelo con los ajustes adecuados
        model.compile({
          optimizer: 'adam',
          // Usar 'categoricalCrossentropy' para un problema de clasificación multiclase
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy'],
        });

        console.log('Model initialized', model);
        resolve(model);
      } catch (error) {
        reject(error);
      }
    });

    trainModel = async (data: DataEntry[]) => {
      this.model = await this.initModel();
    
      if (!this.model) {
        console.error('Model not initialized');
        return;
      }
    
      data.forEach(item => {
        console.log(`Length of input: ${item.input.length + 1}`); // +1 pour inclure la note
      });
    
      const xs = tf.tensor2d(data.map(item => {
        return [...item.input.map(bit => parseFloat(bit))];//, parseFloat(item.note)];
      }));
    
      const actionsAsIndices = data.map(item => this.actionMapping[item.output as keyof typeof this.actionMapping]);
      const ys = tf.oneHot(tf.tensor1d(actionsAsIndices, 'int32'), Object.keys(this.actionMapping).length);
    
      await this.model.fit(xs, ys, {
        epochs: 50,
      });
    };  

    predict = (uuid: string, captors: number[], currentNote: string) => {
      if (!this.model) {
        console.error('Model not initialized');
        return;
      }
    
      const noteValue = parseFloat(currentNote) || 0;  // Gérer le cas null.
      const captorsNumeric = captors.map(c => parseFloat(c));
      
      const inputTensor = tf.tensor2d([captorsNumeric.concat(noteValue)]);
      const prediction = this.model.predict(inputTensor) as tf.Tensor<tf.Rank>;
    
  
    prediction.array().then((array: any) => {
      const predictedIndex = array[0].indexOf(Math.max(...array[0]));
      const predictedAction = Object.keys(this.actionMapping).find(key => this.actionMapping[key] === predictedIndex);
      console.log('Prediction:', predictedAction);
      this.emitMotorEvent(uuid, predictedAction as string);
    });
  };

  getRobotsUuids = async () => {
    return this.tdmController.getRobotsUuids();
  };

  takeControl = (
    uuid: string,
    onVariableChange: (uuid: string, variables: { [name: string]: number }) => void = () => {}
  ) => {
    return this.tdmController.takeControl(uuid, (_uuid, variables) => {
      onVariableChange(uuid, variables);
      let captors = toJS(this.captors.state)[uuid] || [0, 0, 0, 0, 0, 0, 0, 0, 0];

      Object.entries(variables).forEach(([variable, value], index) => {
        switch (variable) {
          case 'prox_ground_0':
            captors[0] = value > 0 ? 1 : 0;
            break;
          case 'prox_ground_1':
            captors[1] = value > 0 ? 1 : 0;
            break;
          case 'prox_front_1':
            captors[2] = value > 0 ? 1 : 0;
            break;
          case 'prox_front_0':
            captors[3] = value > 0 ? 1 : 0;
            break;
          case 'prox_front_2':
            captors[4] = value > 0 ? 1 : 0;
            break;
          case 'prox_front_3':
            captors[5] = value > 0 ? 1 : 0;
            break;
          case 'prox_front_4':
            captors[6] = value > 0 ? 1 : 0;
            break;
          case 'prox_back_0':
            captors[7] = value > 0 ? 1 : 0;
            break;
          case 'prox_back_1':
            captors[8] = value > 0 ? 1 : 0;
            break;
          default:
            break;
        }
      });

      this.captors.set({ ...toJS(this.captors.state), [uuid]: captors });
    });
  };

  emitAction = (uuid: string, action: string, args: number[]) => {
    return this.tdmController.emitAction(uuid, action, args);
  };

  emitMotorEvent = async (uuid: string, action: string) => {
    switch (action) {
      case 'STOP':
        this.emitAction(uuid, 'M_motors', [0, 0]);
        break;
      case 'FORWARD':
        this.emitAction(uuid, 'M_motors', [100, 100]);
        break;
      case 'BACKWARD':
        this.emitAction(uuid, 'M_motors', [-100, -100]);
        break;
      case 'RIGHT':
        this.emitAction(uuid, 'M_motors', [-100, 100]);
        break;
      case 'LEFT':
        this.emitAction(uuid, 'M_motors', [100, -100]);
        break;

      default:
        break;
    }

    setTimeout(() => {
      this.emitAction(uuid, 'M_motors', [0, 0]);
    }, 600);
  };
}
