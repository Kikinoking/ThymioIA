/**
 * ThymioIA.ts
 *
 * This handles the interaction with Thymio robots, managing the neural network model for action prediction,
 * training, and real-time execution. It includes functionalities to initialize, train, and use the model to predict 
 * robot actions based on sensor data. 
 * Class integrates with tf.js, and uses Mobx
 * Was made by Mobsya for the most part, has been adapted for the models used in the app 
 */

import { toJS } from 'mobx';
import { BoundedContext, Container, Observable, createObservable, subscribe } from '../../../helpers';
import { Activity, DataEntry, Robot, TdmController, Thymio } from '../Model';
import type IThymioIA from '../Model/thymioIA.model';
import * as tf from '@tensorflow/tfjs';




function selectActionBasedOnProbabilities(predictions) { //for probabilistic decisions, produces an index proportional to probabilities
//used when we are NOT using winner-take-all
  const cumulativeProbabilities = predictions.reduce((acc, prob, i) => {
    if (i === 0) {
      acc.push(prob);
    } else {
      acc.push(prob + acc[i - 1]);
    }
    return acc;
  }, []);
  const randomNumber = Math.random();
  const selectedIndex = cumulativeProbabilities.findIndex(cumulativeProb => randomNumber <= cumulativeProb);
  return selectedIndex;
}

@BoundedContext({ key: 'ThymioIA', predicate: [] })
export class ThymioIA implements IThymioIA {
  private tdmController: TdmController;
  public model: tf.Sequential | null = null;
  captors: Observable<{ [uuid: string]: number[] }> = createObservable({
    key: 'Thymios',
    initialValue: {},
  });

  actionMapping: Record<string, number> = {//5 actions possible
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

  getModel = (): Promise<tf.Sequential | null> => { //return the model
    return new Promise(resolve => {
      resolve(this.model);
    });
  };

  reinitializeModel = async (inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY') => {//Reinitialize the model, using await
    if (this.model) {
      this.model.dispose();
    }
    this.model = await this.initModel(inputMode);
    console.log(`Model reinitialized with input mode: ${inputMode}`);
  };

  initModel = async (inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY') =>
    new Promise<tf.Sequential>((resolve, reject) => { //intialises the model, with structure depending on inputMode
      try {
        const model = tf.sequential();

        const inputShape = inputMode === 'NOTE_ONLY' ? [1] : [10];
        const outputDim = inputMode === 'NOTE_ONLY' ? 8 : 1;
        model.add(tf.layers.embedding({ inputDim: 38, outputDim: outputDim, inputLength: inputShape }));
        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 5, activation: 'softmax' }));

        model.compile({
          optimizer: tf.train.adam(0.01),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy'],
        });

        console.log('Model initialized', model);
        resolve(model);
      } catch (error) {
        reject(error);
      }
    });

  trainModel = async (data: DataEntry[], inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY') => {
    this.model = await this.initModel(inputMode);

    if (!this.model) {
      console.error('Model not initialized');
      return;
    }
    const trainingData = [];
    const xs = tf.tensor2d(
      data.map(item => {
        if (inputMode === 'NOTE_ONLY') {
          const lastInput = item.input[item.input.length - 1];
          const noteValue = parseFloat(lastInput);
          if (isNaN(noteValue)) {
            console.error('Invalid input, expected numeric value, received:', lastInput);
            throw new Error('All inputs must be numeric');
          }
          return [noteValue];
        } else {
          return item.input.map(bit => {
            const num = parseFloat(bit);
            if (isNaN(num)) {
              console.error('Invalid input for conversion to number:', bit);
              throw new Error('All inputs must be numeric or numeric strings');
            }
            return num;
          });
        }
      })
    );

    const actionsAsIndices = data.map(item => this.actionMapping[item.output as keyof typeof this.actionMapping]); //Trains, and sends weights/biases
    const ys = tf.oneHot(tf.tensor1d(actionsAsIndices, 'int32'), Object.keys(this.actionMapping).length);
    let previousWeights = null;
    await this.model.fit(xs, ys, {
      epochs: 100,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          const currentWeights = this.model.layers.map(layer =>
            layer.getWeights()[0] ? layer.getWeights()[0].dataSync() : null
          );
          if (previousWeights) {
            const changes = currentWeights.map((weights, i) => {
              if (!weights || !previousWeights[i]) return 0;
              return weights.filter((w, idx) => w !== previousWeights[i][idx]).length;
            });
          }
          previousWeights = currentWeights;

          const epochData = this.model.layers.map(layer => {
            const weights = layer.getWeights()[0] ? layer.getWeights()[0].arraySync() : null;
            const biases =
              layer.getWeights().length > 1 && layer.getWeights()[1] ? layer.getWeights()[1].arraySync() : null;
            return { weights, biases };
          });
          trainingData.push(epochData);
        },
      },
    });

    //this.displayModelWeights(); can be useful for debugging
    return trainingData;
  };

  displayModelWeights() { //Just used for debugging but I keep it bcs might still be useful 
    if (!this.model) {
      console.error('No model to display weights for');
      return;
    }

    this.model.layers.forEach((layer, index) => {
      layer.getWeights().forEach((tensor, tensorIndex) => {
        tensor.print();
      });
    });
  }

  predict = (   //Predicts next action to take
    uuid: string,
    captors: number[],
    currentNote: number,
    useWinnerTakesAll = true,
    inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY'
  ) => {
    return new Promise((resolve, reject) => {
      if (!this.model) {
        console.error('Model not initialized');
        reject('Model not initialized');
        return;
      }

      let inputTensor;
      if (inputMode === 'NOTE_ONLY') {
        const noteValue = currentNote || 0;
        console.log('note used to predict: ', noteValue);
        inputTensor = tf.tensor2d([[noteValue]]);
      } else {
        const noteValue = currentNote || 0;
        const captorsNumeric = captors.map(c => Number(c)); 
        inputTensor = tf.tensor2d([captorsNumeric.concat(noteValue)], [1, captorsNumeric.length + 1]);
      }

      const intermediateModels = this.model.layers.map((layer, index) => {
        const subModel = tf.model({
          inputs: this.model.input,
          outputs: this.model.layers[index].output,
        });
        return subModel;
      });

      const activations = intermediateModels.map(model => {
        const result = model.predict(inputTensor);
        if (Array.isArray(result)) {
          return result.map(tensor => tensor.dataSync());
        } else {
          return result.dataSync();
        }
      });

      const prediction = this.model.predict(inputTensor) as tf.Tensor<tf.Rank>; //Makes predictions

      prediction
        .array()
        .then(finalPredictions => {
          const predictions = finalPredictions[0];
          console.log('Raw prediction:', predictions);
          let predictedIndex;
          if (useWinnerTakesAll) {
            predictedIndex = predictions.indexOf(Math.max(...predictions));
          } else {
            predictedIndex = selectActionBasedOnProbabilities(predictions);
          }
          console.log('Predicted index:', predictedIndex); //Log used for debugging, but useful anyway
          const predictedAction = Object.keys(this.actionMapping).find(
            key => this.actionMapping[key] === predictedIndex
          );
          console.log('Prediction:', predictedAction); //Log used for debugging, but useful anyway

          if (predictedAction) {
            this.emitMotorEvent(uuid, predictedAction as string);
          } else {
            console.error(`No action found for predicted index: ${predictedIndex}`);
            reject(`No action found for predicted index: ${predictedIndex}`);
            return;
          }

          resolve({ predictions, activations });
        })
        .catch(error => {
          console.error('Error in prediction:', error);
          reject(error);
        });
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

      Object.entries(variables).forEach(([variable, value], index) => { //Ground values threshold is not 0 but 2, else no line following possible
        switch (variable) {
          case 'prox_ground_0':
            captors[0] = value > 2 ? 1 : 0;
            break;
          case 'prox_ground_1':
            captors[1] = value > 2 ? 1 : 0;
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

      this.captors.set({ ...toJS(this.captors.state), [uuid]: captors }); //set the captors states. Used for by the model
    });
  };

  emitAction = (uuid: string, action: string, args: number[]) => {
    return this.tdmController.emitAction(uuid, action, args);
  };

  emitMotorEvent = async (uuid: string, action: string) => {//Fixed speeds, intentionally slow
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
        this.emitAction(uuid, 'M_motors', [-50, 50]);
        break;
      case 'LEFT':
        this.emitAction(uuid, 'M_motors', [50, -50]);
        break;

      default:
        break;
    }
  };
}
