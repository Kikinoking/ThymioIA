import React, { useState, useEffect } from 'react';

const NeuralNetworkVisualizationTraining = ({ trainingData, inputMode }) => {
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [previousWeights, setPreviousWeights] = useState([]);

  useEffect(() => {
    // Update previous weights upon epoch change
    setPreviousWeights(trainingData[currentEpoch] ? trainingData[currentEpoch].map(layer => layer.weights) : []);
  }, [currentEpoch, trainingData]);

  const svgWidth = 800;
  const svgHeight = 400;
  const inputLayerSize = inputMode === 'NOTE_ONLY' ? 1 : 10;
  const outputLayerSize = 5;  // Assuming the output layer size from your model

  const getColorFromWeightChange = (weight, index, layerIndex, neuronIndex) => {
    const previousWeight = previousWeights[layerIndex] && previousWeights[layerIndex][neuronIndex] ? previousWeights[layerIndex][neuronIndex][index] : null;
    if (previousWeight !== null && weight !== previousWeight) {
      return "yellow";  // Highlight changed weights in yellow
    }
    return getColorFromWeight(weight);
  };

  const getColorFromWeight = (weight) => {
    const normalizedWeight = Math.tanh(weight);
    const red = normalizedWeight > 0 ? Math.floor(255 * normalizedWeight) : 0;
    const blue = normalizedWeight < 0 ? Math.floor(-255 * normalizedWeight) : 0;
    return `rgb(${red}, 0, ${blue})`;
  };

  const epochLayers = trainingData[currentEpoch] || [];
  const layerSpacing = svgWidth / (epochLayers.length + 3);

  return (
    <>
      <svg width={svgWidth} height={svgHeight} style={{ border: '1px solid black' }}>
        {new Array(inputLayerSize).fill(0).map((_, inputIndex) => {
          const yInput = (inputIndex + 1) * svgHeight / (inputLayerSize + 1);
          const xInput = layerSpacing;  // Position X for input neurons
          return (
            <circle key={`input-neuron-${inputIndex}`} cx={xInput} cy={yInput} r={5} fill="blue" />
          );
        })}
        {epochLayers.map((layer, layerIndex) => {
          const x = (layerIndex + 1) * layerSpacing;
          if (!layer.weights) return null;
          const neuronSpacing = svgHeight / (layer.weights.length + 1);
          return (
            <g key={layerIndex}>
              {layer.weights.map((neuronWeights, neuronIdx) => {
                const y = (neuronIdx + 1) * neuronSpacing;
                let lines = [];
                if (layerIndex === 0) {
                  // Connect input neurons directly to the first dense layer (12 neurons)
                  lines = new Array(inputLayerSize).fill(0).map((_, idx) => {
                    const yInput = (idx + 1) * svgHeight / (inputLayerSize + 1);
                    return (
                      <line key={`input-to-layer-link-${idx}-${neuronIdx}`} x1={xInput} y1={yInput} x2={x} y2={y} stroke={getColorFromWeightChange(neuronWeights[idx], idx, layerIndex, neuronIdx)} strokeWidth="2" />
                    );
                  });
                }
                return (
                  <g key={neuronIdx}>
                    {lines}
                    <circle cx={x} cy={y} r={10} fill="purple" />
                    <circle cx={x} cy={y} r={5} fill="blue" />  // Assuming bias does not change
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div>
        <button onClick={() => setCurrentEpoch(Math.max(0, currentEpoch - 1))} disabled={currentEpoch === 0}>Previous Epoch</button>
        <button onClick={() => setCurrentEpoch(Math.min(trainingData.length - 1, currentEpoch + 1))} disabled={currentEpoch === trainingData.length - 1}>Next Epoch</button>
      </div>
      <div style={{ marginTop: '10px' }}>
        <span>Current Epoch: {currentEpoch + 1} / {trainingData.length}</span>
      </div>
    </>
  );
};

export default NeuralNetworkVisualizationTraining;
