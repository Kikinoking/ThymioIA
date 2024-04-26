  import React, { useEffect, useState } from 'react';
  import * as tf from '@tensorflow/tfjs';
  import './NeuralNetworkVisualization.css';

  const NeuralNetworkVisualization = ({ model, inputMode }) => {
    const [layers, setLayers] = useState([]);
    const svgWidth = 800; // Largeur du SVG
    const svgHeight = 400; // Hauteur du SVG
    const outputLayerSize = 5; // Taille prédéfinie de la couche de sortie pour cet exemple
    const inputLayerSize = inputMode === 'NOTE_ONLY' ? 1 : 10; // Taille de la couche d'entrée basée sur le mode

    useEffect(() => {
      if (model) {
        // Récupérer et filtrer les couches à partir de la deuxième couche dense (après l'embedding)
        const modelLayers = model.layers.slice(2).map(layer => {
          const weightsTensor = layer.getWeights()[0];
          const biasesTensor = layer.getWeights()[1];
          const weights = weightsTensor ? weightsTensor.arraySync() : null;
          const biases = biasesTensor ? biasesTensor.arraySync() : null;
          return { type: layer.getClassName(), weights, biases };
        }).filter(layer => layer.weights && layer.biases);

        setLayers(modelLayers);
      }
    }, [model]);

    const layerSpacing = svgWidth / (layers.length + 3); // Espacement pour inclure la couche d'entrée et de sortie

    const getColorFromWeight = (weight) => {
      if (weight === undefined) {
        return 'rgba(255, 255, 255, 0.5)';
      }
      return `rgb(${Math.floor(255 * Math.max(0, weight))}, ${Math.floor(255 * Math.max(0, -weight))}, 0)`;
    };

    return (
      <svg width={svgWidth} height={svgHeight} style={{ border: '1px solid black' }}>
        {/* Ajout de la couche d'entrée */}
        {new Array(inputLayerSize).fill(0).map((_, inputIndex) => {
          const yInput = (inputIndex + 1) * svgHeight / (inputLayerSize + 1);
          const xInput = layerSpacing; // Position X de la couche d'entrée
          return (
            <circle key={`input-neuron-${inputIndex}`} cx={xInput} cy={yInput} r={5} fill="blue" />
          );
        })}

        {/* Dessiner les couches existantes et leurs connexions */}
        {layers.map((layer, layerIndex) => {
          const x = (layerIndex + 2) * layerSpacing; // Décalage pour la nouvelle couche d'entrée
          const neuronSpacing = svgHeight / (layer.weights.length + 1);

          return (
            <g key={layerIndex}>
              {layer.weights.map((neuronWeights, neuronIdx) => {
                const y = (neuronIdx + 1) * neuronSpacing;
                let lines = [];
                // Connexions de la couche d'entrée à la première couche dense
                if (layerIndex === 0) {
                  lines = new Array(inputLayerSize).fill(0).map((_, idx) => {
                    const yInput = (idx + 1) * svgHeight / (inputLayerSize + 1);
                    return (
                      <line
                        key={`input-to-layer-link-${idx}-${neuronIdx}`}
                        x1={layerSpacing}
                        y1={yInput}
                        x2={x}
                        y2={y}
                        stroke="blue"
                        strokeWidth="2"
                      />
                    );
                  });
                }

                // Connexions entre les couches intermédiaires avec coloration basée sur les poids
                if (layerIndex < layers.length - 1) {
                  const nextLayer = layers[layerIndex + 1];
                  const nextX = (layerIndex + 3) * layerSpacing;
                  const nextNeuronSpacing = svgHeight / (nextLayer.weights.length + 1);
                  lines = lines.concat(neuronWeights.map((weight, linkIdx) => {
                    const y2 = (linkIdx + 1) * nextNeuronSpacing;
                    return (
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
                  }));
                }

                return (
                  <g key={neuronIdx}>
                    {lines}
                    <circle cx={x} cy={y} r={10} fill="purple" />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Ajout de la couche de sortie */}
        <g>
          {layers.length > 0 && layers[layers.length - 1].weights.map((neuronWeights, neuronIndex) => {
            const y1 = (neuronIndex + 1) * svgHeight / (layers[layers.length - 1].weights.length + 1);
            return neuronWeights.map((weight, outputIdx) => {
              const y2 = (outputIdx + 1) * svgHeight / (outputLayerSize + 1);
              const x1 = (layers.length + 1) * layerSpacing; // Ajusté pour l'emplacement correct
              const x2 = svgWidth - layerSpacing;
              return (
                <line
                  key={`output-line-${neuronIndex}-${outputIdx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={getColorFromWeight(weight)}
                  strokeWidth="2"
                />
              );
            });
          })}
          {new Array(outputLayerSize).fill(0).map((_, index) => {
            const y = (index + 1) * svgHeight / (outputLayerSize + 1);
            const x = svgWidth - layerSpacing; // Position X ajustée pour la couche de sortie
            return (
              <circle key={`output-neuron-${index}`} cx={x} cy={y} r={10} fill="red" />
            );
          })}
        </g>
      </svg>
    );
  };

  export default NeuralNetworkVisualization;
