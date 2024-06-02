import { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import './NeuralNetworkVisualization.css';
import Svgaction1 from '../../../assets/actionsicons/STOPStatic.png';
import Svgaction2 from '../../../assets/actionsicons/ForwardStatic.png';
import Svgaction3 from '../../../assets/actionsicons/BackStaticV2.png';
import Svgaction4 from '../../../assets/actionsicons/RightStatic.png';
import Svgaction5 from '../../../assets/actionsicons/LeftStatic.png';

const NeuralNetworkVisualization = ({
  model,
  inputMode,
  activations,
  outputactiv,
  sensorData,
  currentNote,
  onNeuronCoordinates,
  showBiases,
}) => {
  const [layers, setLayers] = useState([]);
  const svgWidth = 800; 
  const svgHeight = 400; 
  const outputLayerSize = 5; // predefined output layer size
  const inputLayerSize = inputMode === 'NOTE_ONLY' ? 1 : 10; 
  const [updateKey, setUpdateKey] = useState(0);
  const [maxRadiusIndex, setMaxRadiusIndex] = useState(-1);

  const neuronRefs = useRef([]);

  useEffect(() => {
    const neuronCoordinates = neuronRefs.current
      .map(neuron => {
        if (neuron) {
          const box = neuron.getBBox();
          const svgRect = neuron.ownerSVGElement.getBoundingClientRect();
          
          return {
            x: svgRect.left + box.x + box.width / 2,
            y: svgRect.top + box.y + box.height / 2,
          };
        }
        return null;
      })
      .filter(coord => coord !== null); //filter non-valid entries

    onNeuronCoordinates(neuronCoordinates);
  }, [model, neuronRefs.current]);

  useEffect(() => {
    function handleResize() {
      // Recompute coords if resize happened
      if (neuronRefs.current) {
        const neuronCoordinates = neuronRefs.current
          .map(neuron => {
            if (neuron) {
              const box = neuron.getBBox();
              const svgRect = neuron.ownerSVGElement.getBoundingClientRect();
              return {
                x: svgRect.left + box.x + box.width / 2,
                y: svgRect.top + box.y + box.height / 2,
              };
            }
            return null;
          })
          .filter(coord => coord !== null);
        onNeuronCoordinates(neuronCoordinates);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [neuronRefs.current]);

  useEffect(() => {
    setUpdateKey(prevKey => prevKey + 1); //inc key
  }, [activations]);

  useEffect(() => {
    setUpdateKey(updateKey + 1); // Force update on sensorData change
  }, [sensorData]);

  useEffect(() => {
    if (neuronRefs.current.length > 0) {
      const coordinates = neuronRefs.current
        .map(neuron => {
          if (neuron) {
            const rect = neuron.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
          return null;
        })
        .filter(coord => coord !== null); //filter entries

   
      onNeuronCoordinates(coordinates);
    }
  }, [model, neuronRefs.current]); // Dependency on model, and neurons

  const getBiasColor = bias => {
    // Normalize bias for visualization purposes
    const normalizedBias = Math.tanh(bias);
    return getColorFromWeight(normalizedBias);
  };
  const calculateMicrophoneRadius = noteValue => {
    const minRadius = 5; // min radius for mic neuron
    const maxRadius = 10; // Max radius for mic neuron
    const maxValue = 60; 

    return Math.min(maxRadius, minRadius + (noteValue / maxValue) * (maxRadius - minRadius));
  };

  const calculateRadius = activationValue => {
    const minActivation = -1; // Minimum activation
    const maxActivation = 1; // Maximum activation
    const minRadius = 4; // min radius, else neuron is not visible because too small
    const maxRadius = 10; // ceiling for max radius

    // If activation close to zero, to avoid 0 divisin
    if (Math.abs(activationValue) < 0.0001) {
      return minRadius;
    }

    if (activationValue < minActivation) {
      return minRadius;
    } else if (activationValue > maxActivation) {
      return maxRadius;
    } else {
      // Interp linear for radii
      const normalized = (activationValue - minActivation) / (maxActivation - minActivation);
      return normalized * (maxRadius - minRadius) + minRadius;
    }
  };

  useEffect(() => {
    const updateCoordinates = () => {
      const newCoordinates = neuronRefs.current
        .map(neuron => {
          if (neuron) {
            const rect = neuron.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
          return null;
        })
        .filter(coord => coord !== null);
      onNeuronCoordinates(newCoordinates);
    };

    updateCoordinates(); 
    const observer = new ResizeObserver(updateCoordinates); // Use observer to look for changes

    if (neuronRefs.current && neuronRefs.current.length > 0) {
      neuronRefs.current.forEach(neuron => {
        observer.observe(neuron);
      });
    }

    return () => {
      observer.disconnect(); //cleanup obs
    };
  }, [model, neuronRefs.current, svgWidth, svgHeight]);

  useEffect(() => {
    if (model) {
      // get layers from layer 2 onwards
      const modelLayers = model.layers
        .slice(2)
        .map((layer, index) => {
          const weightsTensor = layer.getWeights()[0];
          const biasesTensor = layer.getWeights()[1];
          const weights = weightsTensor ? weightsTensor.arraySync() : null;
          const biases = biasesTensor ? biasesTensor.arraySync() : null;

          const activation = activations && activations[index + 1] ? activations[index + 1] : null;

          return { type: layer.getClassName(), weights, biases, activation };
        })
        .filter(layer => layer.weights && layer.biases);

      setLayers(modelLayers);
    }
  }, [model, activations]);

  const layerSpacing = svgWidth / (layers.length + 3); //spacing adjusted for input layer

  useEffect(() => {
    if (outputactiv) {
      // Compute output radii and update them
      const outputRadii = outputactiv.map(activation => calculateRadius(activation));
      const newMaxRadiusIndex = outputRadii.indexOf(Math.max(...outputRadii));

      setMaxRadiusIndex(newMaxRadiusIndex);
    }
  }, [outputactiv]);

  const getColorFromWeight = weight => {
    if (weight === undefined) {
      return 'rgba(255, 255, 255, 0.5)'; //Should never happen
    }
    // computes intensity colors, same as visu training component
    const red = Math.min(255, Math.floor(255 * Math.max(0, -weight) * 1.5)); // Amplifies positive w.
    const green = Math.min(255, Math.floor(255 * Math.max(0, weight) * 1.5)); // Amplifies neg w.

    return `rgb(${red}, ${green}, 0)`;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <svg key={updateKey} width={svgWidth} height={svgHeight} style={{ border: '1px solid black' }}>
        {/*Adds input layer */}
        {inputMode === 'CAPTORS_AND_NOTE' ? (
          sensorData
            .map((sensor, index) => {
              // Changes color to green if sensor is active
              const isActive = sensor > 0; 
              const fillColor = isActive ? 'green' : 'black'; 

              return (
                <circle
                  ref={el => (neuronRefs.current[index] = el)}
                  key={`sensor-${index}-${sensor}`} 
                  cx={layerSpacing * 0.5} 
                  cy={((index + 1) * svgHeight) / (inputLayerSize + 1)}
                  r={calculateRadius(sensor)} 
                  fill={fillColor} 
                  stroke="black"
                />
              );
            })
            .concat(
              <circle
                ref={el => (neuronRefs.current[sensorData.length] = el)}
                key="microphone-neuron"
                cx={layerSpacing * 0.5}
                cy={((sensorData.length + 1) * svgHeight) / (inputLayerSize + 1)}
                r={calculateMicrophoneRadius(currentNote)}
                fill="green"
                stroke="black"
              />
            )
        ) : (
          <circle
            ref={el => (neuronRefs.current[0] = el)}
            id="input-neuron-microphone"
            key="microphone-only-neuron"
            cx={layerSpacing * 0.5}
            cy={svgHeight / 2}
            r={calculateMicrophoneRadius(currentNote)}
            fill="green"
            stroke="black"
          />
        )}

        {/* Output layer */}
        <g>
          {layers.length > 0 &&
            layers[layers.length - 1] &&
            layers[layers.length - 1].weights &&
            layers[layers.length - 1].weights.map((neuronWeights, neuronIndex) => {
              const y1 = ((neuronIndex + 1) * svgHeight) / (layers[layers.length - 1].weights.length + 1);
              return neuronWeights.map((weight, outputIdx) => {
                const y2 = ((outputIdx + 1) * svgHeight) / (outputLayerSize + 1);
                const x1 = (layers.length + 1) * layerSpacing;
                const x2 = svgWidth - layerSpacing;
                const svgX = x2 + 20; 
                const svgSize = 60;
                const svgImages = [Svgaction1, Svgaction2, Svgaction3, Svgaction4, Svgaction5];
                const svgSrc = svgImages[outputIdx % svgImages.length];
                return (
                  <React.Fragment key={`fragment-${neuronIndex}-${outputIdx}`}>
                    <line
                      key={`output-line-${neuronIndex}-${outputIdx}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={getColorFromWeight(weight)}
                      strokeWidth="2"
                    />
                    
                    <image
                      key={`svg-image-${outputIdx}`}
                      href={svgSrc}
                      x={svgX}
                      y={y2 - svgSize / 2}
                      width={svgSize}
                      height={svgSize}
                    />
                    <rect
                      x={svgX}
                      y={y2 - svgSize / 2}
                      width={svgSize}
                      height={svgSize}
                      fill="none"
                      stroke={outputIdx === maxRadiusIndex ? 'yellow' : 'black'}
                      strokeWidth="1.5"
                    />
                  </React.Fragment>
                );
              });
            })}
          {layers.length > 0 &&
            layers[layers.length - 1] &&
            layers[layers.length - 1].biases &&
            new Array(outputLayerSize).fill(0).map((_, index) => {
              const y = ((index + 1) * svgHeight) / (outputLayerSize + 1);
              const x = svgWidth - layerSpacing; 
              const radiusoutput = outputactiv ? calculateRadius(outputactiv[index]) : 10;
              return (
                <g key={`output-neuron-${index}`}>
                  <circle cx={x} cy={y} r={radiusoutput} fill="orange" />
                  {showBiases && (
                    <circle
                      cx={x}
                      cy={y}
                      r={Math.min(5, radiusoutput / 2)}
                      fill={getBiasColor(layers[layers.length - 1].biases[index])}
                    />
                  )}
                </g>
              );
            })}
        </g>
        {/* Draw all other layers */}
        {layers.map((layer, layerIndex) => {
          const x = (layerIndex + 2) * layerSpacing;
          const neuronSpacing = svgHeight / (layer.weights.length + 1);

          return (
            <g key={layerIndex}>
              {/* draw first lines*/}
              {layer.weights.map((neuronWeights, neuronIdx) => {
                const y = (neuronIdx + 1) * neuronSpacing;
                let lines = [];
                
                if (inputMode === 'CAPTORS_AND_NOTE' && layerIndex === 0) {
                  lines = sensorData.map((sensor, idx) => {
                    const yInput = ((idx + 1) * svgHeight) / (sensorData.length + 2);
                    const isActive = sensor > 0;
                    const fillColor = isActive ? 'green' : 'black';
                    return (
                      <line
                        key={`input-to-layer-link-${idx}-${neuronIdx}`}
                        x1={layerSpacing * 0.5}
                        y1={yInput}
                        x2={x}
                        y2={y}
                        stroke={fillColor}
                        strokeWidth="2"
                      />
                    );
                  });
                }

                
                if (layerIndex === 0) {
                  const yInput =
                    inputMode === 'NOTE_ONLY' ? svgHeight / 2 : svgHeight - svgHeight / (sensorData.length + 2); //mic pos
                  const microphoneColor = 'green'; 
                  lines.push(
                    <line
                      key={`input-to-layer-link-mic-${neuronIdx}`}
                      x1={layerSpacing * 0.5}
                      y1={yInput}
                      x2={x}
                      y2={y}
                      stroke={microphoneColor}
                      strokeWidth="2"
                    />
                  );
                }
                
                if (layerIndex < layers.length - 1) {
                  const nextLayer = layers[layerIndex + 1];
                  const nextX = (layerIndex + 3) * layerSpacing;
                  const nextNeuronSpacing = svgHeight / (nextLayer.weights.length + 1);
                  neuronWeights.forEach((weight, linkIdx) => {
                    const y2 = (linkIdx + 1) * nextNeuronSpacing;
                    lines.push(
                      <line
                        key={`link-${layerIndex}-${neuronIdx}-${linkIdx}`}
                        x1={x}
                        y1={y}
                        x2={nextX}
                        y2={y2}
                        stroke={getColorFromWeight(weight)}
                        strokeWidth="2"
                      />
                    );
                  });
                }

                
                return lines;
              })}

              {/* Draw neuron circles*/}
              {layer.weights.map((_, neuronIdx) => {
                const y = (neuronIdx + 1) * neuronSpacing;
                const radius =
                  layer.activation && !isNaN(layer.activation[neuronIdx])
                    ? calculateRadius(layer.activation[neuronIdx])
                    : 5;

                return (
                  <g key={`neuron-${layerIndex}-${neuronIdx}`}>
                    <circle cx={x} cy={y} r={Math.min(10, radius)} fill="white" />
                    {showBiases && (
                      <circle cx={x} cy={y} r={Math.min(10, radius / 2)} fill={getBiasColor(layer.biases[neuronIdx])} />
                    )}
                  </g>
                );
              })}

              {/*neuron circles again*/}
              {layer.weights.map((_, neuronIdx) => {
                const y = (neuronIdx + 1) * neuronSpacing;
                const radius =
                  layer.activation && !isNaN(layer.activation[neuronIdx])
                    ? calculateRadius(layer.activation[neuronIdx])
                    : 5;

                return (
                  <g key={`neuron-${layerIndex}-${neuronIdx}`}>
                    <circle cx={x} cy={y} r={Math.min(10, radius)} fill="white" />
                    {showBiases && (
                      <circle cx={x} cy={y} r={Math.min(10, radius / 2)} fill={getBiasColor(layer.biases[neuronIdx])} />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default NeuralNetworkVisualization;
