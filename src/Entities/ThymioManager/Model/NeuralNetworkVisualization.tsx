import React, { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import './NeuralNetworkVisualization.css';

const NeuralNetworkVisualization = ({ model }) => {
  const [layers, setLayers] = useState([]);
  const svgWidth = 800; // Largeur du SVG
  const svgHeight = 400; // Hauteur du SVG

  useEffect(() => {
    if (model) {
      const modelLayers = model.layers.map(layer => {
        const { inputShape, outputShape } = layer;
        const weights = layer.getWeights()[0]?.arraySync();
        const biases = layer.getWeights()[1]?.arraySync();
        return { inputShape, outputShape, weights, biases };
      });
      setLayers(modelLayers);
    }
  }, [model]);

  const getColorFromWeight = (weight) => {
    if (weight === undefined) {
      return 'rgba(255, 255, 255, 0.5)';
    }
    return `rgb(${Math.floor(255 * Math.max(0, weight))},${Math.floor(255 * Math.max(0, -weight))},0)`;
  };

  return (
    <svg width={svgWidth} height={svgHeight} style={{ border: '1px solid black' }}>
      {layers.map((layer, layerIdx) => {
        const layerWidth = svgWidth / layers.length;
        const neuronSpacing = svgHeight / (layer.weights ? layer.weights.length + 1 : 1);

        return (
          <>
            {layer.weights?.map((neuronWeights, neuronIdx) => {
              const x1 = layerWidth * layerIdx + layerWidth / 2; // Position X du neurone
              const y1 = neuronSpacing * (neuronIdx + 1); // Position Y du neurone

              return (
                <>
                  {neuronWeights.map((weight, linkIdx) => {
                    // Assurez-vous que la couche suivante existe avant de tracer des liens
                    if (layerIdx < layers.length - 1 && layers[layerIdx + 1].weights) {
                      const nextLayerNeuronSpacing = svgHeight / (layers[layerIdx + 1].weights.length + 1);
                      const x2 = layerWidth * (layerIdx + 1) + layerWidth / 2; // Position X du neurone suivant
                      const y2 = nextLayerNeuronSpacing * (linkIdx + 1); // Position Y du neurone suivant

                      return (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={getColorFromWeight(weight)}
                          strokeWidth={2}
                        />
                      );
                    }
                    return null;
                  })}
                  <circle cx={x1} cy={y1} r={10} fill="blue" />
                  {layer.biases && (
                    <circle cx={x1} cy={y1} r={5} fill={getColorFromWeight(layer.biases[neuronIdx])} />
                  )}
                </>
              );
            })}
          </>
        );
      })}
    </svg>
  );
};

export default NeuralNetworkVisualization;
