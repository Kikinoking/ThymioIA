import { toJS } from 'mobx';
import { BoundedContext, Container, Observable, createObservable, subscribe } from '../../../helpers';
import { Activity, DataEntry, Robot, TdmController, Thymio } from '../Model';
import type IThymioIA from '../Model/thymioIA.model';
import * as tf from '@tensorflow/tfjs';
import { noteToNumberMapping } from '../../../noteMapping';
import BarChart from '../../BarChart';
import * as tfvis from '@tensorflow/tfjs-vis';



function selectActionBasedOnProbabilities(predictions) {
  //Array of intervals based on probabilities
  const cumulativeProbabilities = predictions.reduce((acc, prob, i) => {
    if (i === 0) {
      acc.push(prob);
    } else {
      acc.push(prob + acc[i - 1]);
    }
    return acc;
  }, []);
  //Pick random number
  const randomNumber = Math.random();
  //Check in which interval the number falls in

  const selectedIndex = cumulativeProbabilities.findIndex(cumulativeProb => randomNumber <= cumulativeProb);
  console.log("cumulprobs: ", cumulativeProbabilities)
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

  getModel = (): Promise<tf.Sequential | null> => {
    return new Promise((resolve) => {
      resolve(this.model);
    });
  };

  reinitializeModel = async (inputMode: string) => {
    if (this.model) {
      this.model.dispose(); // Dispose the current model if it exists
    }
    this.model = await this.initModel(inputMode); // Initialize the new model with the specified mode
    console.log(`Model reinitialized with input mode: ${inputMode}`);
  };
  

  initModel = async (inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY') =>
  new Promise<tf.Sequential>((resolve, reject) => {
    try {
      const model = tf.sequential();

      // Définir la taille de l'entrée basée sur le mode d'entrée sélectionné
      const inputShape = inputMode === 'NOTE_ONLY' ? [1] : [10]; // 9 capteurs + 1 note ou juste 1 note

      // Ajouter la première couche en spécifiant la forme d'entrée
      model.add(tf.layers.embedding({inputDim: 38, outputDim: 12, inputLength: inputShape}));
      model.add(tf.layers.flatten());
      model.add(tf.layers.dense({units: 8, activation: 'relu'}));
      model.add(tf.layers.dense({units: 5, activation: 'softmax'}));

      // Compiler le modèle avec les ajustements adéquats
      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      console.log('Model initialized', model);
      resolve(model);
    } catch (error) {
      reject(error);
    }
  });

  trainModel = async (data: DataEntry[], inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY' ) => {
     
    this.model = await this.initModel(inputMode);

    if (!this.model) {
        console.error('Model not initialized');
        return;
    }
    const trainingData = []; //training data of each epoch
    // Préparation des tensors pour l'entrainement
    const xs = tf.tensor2d(data.map(item => {
        if (inputMode === 'NOTE_ONLY') {
            // Utilise uniquement le dernier élément de item.input comme entrée
            console.log("input: ",item.input[item.input.length - 1] )
            return [item.input[item.input.length - 1]]; // La dernière entrée est le numéro de la note
        } else { // CAPTORS_AND_NOTE
            // Utilise tout item.input qui inclut déjà le numéro de la note
            return item.input.map(bit => parseFloat(bit));
        }
    }));

    
    const actionsAsIndices = data.map(item => this.actionMapping[item.output as keyof typeof this.actionMapping]);
    const ys = tf.oneHot(tf.tensor1d(actionsAsIndices, 'int32'), Object.keys(this.actionMapping).length);
    let previousWeights = null;
    await this.model.fit(xs, ys, {
      epochs: 50,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          const currentWeights = this.model.layers.map(layer => layer.getWeights()[0] ? layer.getWeights()[0].dataSync() : null);
          if (previousWeights) {
            const changes = currentWeights.map((weights, i) => {
              if (!weights || !previousWeights[i]) return 0;
              return weights.filter((w, idx) => w !== previousWeights[i][idx]).length;
            });
            console.log(`Weights changed from previous epoch in layer:`, changes);
          }
          previousWeights = currentWeights;
        
            console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
            this.model.layers.forEach((layer, index) => {
              console.log(`Layer ${index} weights:`, layer.getWeights()[0] ? layer.getWeights()[0].dataSync(): null);
            });
          
          const epochData = this.model.layers.map(layer => {
            const weights = layer.getWeights()[0] ? layer.getWeights()[0].arraySync() : null;
                    const biases = layer.getWeights().length > 1 && layer.getWeights()[1] ? layer.getWeights()[1].arraySync() : null;
                    return { weights, biases };
            
          });
          trainingData.push(epochData);
        }
      }
    });

  this.displayModelWeights(); // Afficher les poids après l'entraînement
  return trainingData;
};

displayModelWeights() {
  if (!this.model) {
    console.error('No model to display weights for');
    return;
  }

  this.model.layers.forEach((layer, index) => {
    console.log(`Weights of layer ${index}:`);
    layer.getWeights().forEach((tensor, tensorIndex) => {
      console.log(`Tensor ${tensorIndex}:`);
      tensor.print(); // Afficher les valeurs du tensor
      console.log(`Number of elements in Tensor ${tensorIndex}:`, tensor.size); // Afficher le nombre d'éléments dans le tensor
    });
  });
}
    predict = (uuid: string, captors: number[], currentNote: number, useWinnerTakesAll = true,inputMode: 'CAPTORS_AND_NOTE' | 'NOTE_ONLY') => {
      return new Promise((resolve, reject) => {
        if (!this.model) {
          console.error('Model not initialized');
          reject('Model not initialized');
          return;
        }
        

      
        let inputTensor;
        if (inputMode === 'NOTE_ONLY') {
          const noteValue =currentNote || 0;
          
          console.log("note used to predict: ", noteValue)
          inputTensor = tf.tensor2d([[noteValue]]);
        } else { // CAPTORS_AND_NOTE
          const noteValue = currentNote || 0;
          const captorsNumeric = captors.map(c => parseFloat(c));
          inputTensor = tf.tensor2d([captorsNumeric.concat(noteValue)], [1, captorsNumeric.length + 1]); // [1, 10]
    }   

          const intermediateModels = this.model.layers.map((layer, index) => {
            const subModel = tf.model({
              inputs: this.model.input,
              outputs: this.model.layers[index].output
            });
            return subModel;
          });

        const activations = intermediateModels.map(model => model.predict(inputTensor).dataSync());
    
        const prediction = this.model.predict(inputTensor) as tf.Tensor<tf.Rank>;
    
        prediction.array().then(finalPredictions => {
          const predictions = finalPredictions[0];
          console.log('Raw prediction:', predictions);
          let predictedIndex;
          if (useWinnerTakesAll) {
            predictedIndex = predictions.indexOf(Math.max(...predictions));
          } else { predictedIndex = selectActionBasedOnProbabilities(predictions)

          }
          console.log('Predicted index:', predictedIndex);
          const predictedAction = Object.keys(this.actionMapping).find(key => this.actionMapping[key] === predictedIndex);
          console.log('Prediction:', predictedAction);
    
          if (predictedAction) {
            this.emitMotorEvent(uuid, predictedAction as string);
          } else {
            console.error(`No action found for predicted index: ${predictedIndex}`);
            reject(`No action found for predicted index: ${predictedIndex}`);
            return;
          }
    
          // Résoudre la promesse avec les prédictions
          resolve({ predictions, activations });
        }).catch(error => {
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
    /*
    setTimeout(() => {
      this.emitAction(uuid, 'M_motors', [0, 0]);
    }, 600);*/
    
  };
}
