  import React, { useEffect, useState } from 'react';
  import * as tf from '@tensorflow/tfjs';
  import './NeuralNetworkVisualization.css';
  import Svgaction1 from '../../../assets/actionsicons/STOPStatic.png'
  import Svgaction2 from '../../../assets/actionsicons/ForwardStatic.png';
  import Svgaction3 from '../../../assets/actionsicons/BackStaticV2.png';
  import Svgaction4 from '../../../assets/actionsicons/RightStatic.png';
  import Svgaction5 from '../../../assets/actionsicons/LeftStatic.png';

  const NeuralNetworkVisualization = ({ model, inputMode, activations , outputactiv, sensorData, currentNote }) => {
    const [layers, setLayers] = useState([]);
    const svgWidth = 800; // Largeur du SVG
    const svgHeight = 400; // Hauteur du SVG
    const outputLayerSize = 5; // Taille prédéfinie de la couche de sortie pour cet exemple
    const inputLayerSize = inputMode === 'NOTE_ONLY' ? 1 : 10; // Taille de la couche d'entrée basée sur le mode
    const [updateKey, setUpdateKey] = useState(0);
    const [maxRadiusIndex, setMaxRadiusIndex] = useState(-1);
   

    useEffect(() => {
      setUpdateKey(prevKey => prevKey + 1);  // Incrémente la clé à chaque changement d'activations
    }, [activations])

    useEffect(() => {
      setUpdateKey(updateKey + 1); // Force update on sensorData change
    }, [sensorData]); 

    const getBiasColor = (bias) => {
      // Normalize bias for visualization purposes
      const normalizedBias = Math.tanh(bias);
      return getColorFromWeight(normalizedBias);


    };
    const calculateMicrophoneRadius = (noteValue) => {
      const minRadius = 5;  // Rayon minimum pour le neurone du microphone
      const maxRadius = 10; // Rayon maximum pour le neurone du microphone
      const maxValue = 60; // Supposons que la valeur maximale pour noteValue soit 100
    
      return Math.min(maxRadius, minRadius + (noteValue / maxValue) * (maxRadius - minRadius));
    };
    

    const calculateRadius = (activationValue) => {
      const minActivation = -1; // Minimum d'activation
      const maxActivation = 1; // Maximum d'activation ajusté
      const minRadius = 4 ; // Rayon minimum pour garantir la visibilité
      const maxRadius = 10; // Plafond pour le rayon maximal
  
      // Traiter spécifiquement le cas où activationValue est 0 ou très proche de zéro
      if (Math.abs(activationValue) < 0.0001) {
          return minRadius;
      }
  
      if (activationValue < minActivation) {
          return minRadius;
      } else if (activationValue > maxActivation) {
          return maxRadius;
      } else {
          // Interpolation linéaire entre minRadius et maxRadius
          const normalized = (activationValue - minActivation) / (maxActivation - minActivation);
          return normalized * (maxRadius - minRadius) + minRadius;
      }
  };
  
  
    

    useEffect(() => {
      if (model) {
        // Récupérer et filtrer les couches à partir de la deuxième couche dense (après l'embedding)
        const modelLayers = model.layers.slice(2).map((layer, index) => {
          const weightsTensor = layer.getWeights()[0];
          const biasesTensor = layer.getWeights()[1];
          const weights = weightsTensor ? weightsTensor.arraySync() : null;
          const biases = biasesTensor ? biasesTensor.arraySync() : null;
          
          const activation = activations && activations[index+1] ? activations[index+1]: null;
         
          return { type: layer.getClassName(), weights, biases ,activation};
        }).filter(layer => layer.weights && layer.biases );
       
        setLayers(modelLayers);
      }
    }, [model, activations]);

    

   

    const layerSpacing = svgWidth / (layers.length + 3); // Espacement pour inclure la couche d'entrée et de sortie

    
    useEffect(() => {
      if (outputactiv) {
        
    
        // Calculer les rayons basés directement sur outputactiv
        const outputRadii = outputactiv.map(activation => calculateRadius(activation));
        const newMaxRadiusIndex = outputRadii.indexOf(Math.max(...outputRadii));
    
    
        
    
        setMaxRadiusIndex(newMaxRadiusIndex);
      }
    }, [outputactiv]); // Dépendance uniquement sur outputactiv
    
    
    

    const getColorFromWeight = (weight) => {
      if (weight === undefined) {
          return 'rgba(255, 255, 255, 0.5)'; // Couleur par défaut pour les poids non définis
      }
      // Calcul de l'intensité des couleurs en amplifiant les variations
      const red = Math.min(255, Math.floor(255 * Math.max(0, -weight) * 1.5)); // Amplifie les poids négatifs
      const green = Math.min(255, Math.floor(255 * Math.max(0, weight) * 1.5)); // Amplifie les poids positifs
  
      return `rgb(${red}, ${green}, 0)`;
  };
  

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <svg key={updateKey} width={svgWidth} height={svgHeight} style={{ border: '1px solid black' }}>
        {/* Ajout de la couche d'entrée */}
        {inputMode === 'CAPTORS_AND_NOTE' ? (
            sensorData.map((sensor, index) => (
              <circle
                key={`sensor-${index}-${sensor}`} // Ajout de sensor dans la clé pour forcer la mise à jour
                cx={layerSpacing * 0.5} // Constant x pour simplifier
                cy={(index + 1) * svgHeight / (inputLayerSize + 1)}
                r={calculateRadius(sensor)}
                fill="blue"
                stroke="black"
              />
            )).concat(
              <circle
                key="microphone-neuron"
                cx={layerSpacing * 0.5}
                cy={(sensorData.length + 1) * svgHeight / (inputLayerSize + 1)}
                r={calculateMicrophoneRadius(currentNote)}
                fill="blue"
                stroke="black"
              />
            )
          ) : (
            <circle
              key="microphone-only-neuron"
              cx={layerSpacing * 0.5}
              cy={svgHeight / 2}
              r={calculateMicrophoneRadius(currentNote)}
              fill="blue"
              stroke="black"
            />
          )}


{/* Ajout de la couche de sortie */}
<g>
        {layers.length > 0 && layers[layers.length - 1] && layers[layers.length - 1].weights &&
    layers[layers.length - 1].weights.map((neuronWeights, neuronIndex) => {
            const y1 = (neuronIndex + 1) * svgHeight / (layers[layers.length - 1].weights.length + 1);
            return neuronWeights.map((weight, outputIdx) => {
              const y2 = (outputIdx + 1) * svgHeight / (outputLayerSize + 1);
              const x1 = (layers.length + 1) * layerSpacing; // Ajusté pour l'emplacement correct
              const x2 = svgWidth - layerSpacing;
              const svgX = x2 + 20; // Ajoute un petit espace
              const svgSize = 60; // Taille ajustable du SVG
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
                {/* Charger l'image SVG */}
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
              stroke={outputIdx === maxRadiusIndex ? "yellow" : "black"}
              strokeWidth="1.5"
            />
              </React.Fragment>
              );
            });
          })}
          {layers.length > 0 && layers[layers.length - 1] && layers[layers.length - 1].biases &&
    new Array(outputLayerSize).fill(0).map((_, index) => {
      const y = (index + 1) * svgHeight / (outputLayerSize + 1);
      const x = svgWidth - layerSpacing; // Position X ajustée pour la couche de sortie
      const radiusoutput = outputactiv ? calculateRadius(outputactiv[index]) : 10;
      return (
        <g key={`output-neuron-${index}`}>
          <circle cx={x} cy={y} r={radiusoutput} fill="orange" />
          <circle cx={x} cy={y} r={Math.min(5, radiusoutput / 2)} fill={getBiasColor(layers[layers.length - 1].biases[index])} />
        </g>
      );
    })}
</g>
        {/* Dessiner les couches existantes et leurs connexions */}
        {layers.map((layer, layerIndex) => {
  const x = (layerIndex + 2) * layerSpacing; // Décalage pour la nouvelle couche d'entrée
  const neuronSpacing = svgHeight / (layer.weights.length + 1);

  return (
    <g key={layerIndex}>
      {/* Dessiner d'abord les lignes pour les connexions */}
      {layer.weights.map((neuronWeights, neuronIdx) => {
        const y = (neuronIdx + 1) * neuronSpacing;

        // Connexions de la couche d'entrée à la première couche dense
        const lines = (layerIndex === 0) ? new Array(inputLayerSize).fill(0).map((_, idx) => {
          const yInput = (idx + 1) * svgHeight / (inputLayerSize + 1);
          return (
            <line
              key={`input-to-layer-link-${idx}-${neuronIdx}`}
              x1={layerSpacing * 0.5}
              y1={yInput}
              x2={x}
              y2={y}
              stroke="blue"
              strokeWidth="2"
            />
          );
        }) : [];

        // Connexions entre les couches intermédiaires avec coloration basée sur les poids
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

        // Rendu des lignes de connexion
        return lines;
      })}

      {/* Ensuite, dessiner les cercles pour les neurones */}
      {layer.weights.map((_, neuronIdx) => {
        const y = (neuronIdx + 1) * neuronSpacing;
        const radius = layer.activation && !isNaN(layer.activation[neuronIdx]) ? calculateRadius(layer.activation[neuronIdx]) : 5;

        return (
          <g key={`neuron-${layerIndex}-${neuronIdx}`}>
            <circle cx={x} cy={y} r={Math.min(10, radius)} fill="purple" />
            <circle cx={x} cy={y} r={Math.min(10, radius / 2)} fill={getBiasColor(layer.biases[neuronIdx])} />
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
