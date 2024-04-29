    import React, { useState, useEffect, useRef } from 'react';

    const NeuralNetworkVisualizationTraining = ({ trainingData, inputMode }) => {
        
    const [currentEpoch, setCurrentEpoch] = useState(0);
    const [previousWeights, setPreviousWeights] = useState([]);
    const [currentWeights, setCurrentWeights] = useState([]);
    const [cumulativeChanges, setCumulativeChanges] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationIntervalId = useRef(null);
    const currentEpochRef = useRef(0); // Using ref to track the current epoch
    const [cumulativeBiasChanges, setCumulativeBiasChanges] = useState([]);
    

    useEffect(() => {
        currentEpochRef.current = currentEpoch; // Update ref whenever state changes
    }, [currentEpoch]);
    
    useEffect(() => {
        // Update weights on epoch change
        if (trainingData[currentEpoch]) {
            const newWeights = trainingData[currentEpoch].map(layer => layer.weights|| []);
            const newBiases = trainingData[currentEpoch].map(layer => layer.biases || []);
            if (currentEpoch > 0) { // Update previous weights only if it's not the first epoch
                setPreviousWeights(currentWeights);
            }
            setCurrentWeights(newWeights);
            updateCumulativeChanges(newWeights, newBiases);}}
            
    , [currentEpoch, trainingData]);
    const updateCumulativeChanges = (newWeights, newBiases) => { 
        const newCumulativeChanges = newWeights.map((layerWeights, layerIndex) =>
            layerWeights.map((neuronWeights, neuronIndex) =>
                neuronWeights.map((weight, weightIndex) => {
                    const previousWeight = previousWeights[layerIndex]?.[neuronIndex]?.[weightIndex] || 0;
                    const change = weight - previousWeight;
                    const oldCumulativeChange = cumulativeChanges[layerIndex]?.[neuronIndex]?.[weightIndex] || 0;
                    return oldCumulativeChange + Math.tanh(change) * 5;
                })
            )
        );
        setCumulativeChanges(newCumulativeChanges);

        const newCumulativeBiasChanges = newBiases.map((layerBiases, layerIndex) =>
            layerBiases.map((bias, neuronIndex) => {
                const previousBias = cumulativeBiasChanges[layerIndex]?.[neuronIndex] || 0;
                const biasChange = bias - previousBias;
                return previousBias + Math.tanh(biasChange) * 5;
            })
        );
        setCumulativeBiasChanges(newCumulativeBiasChanges); // Mise à jour des changements cumulatifs des biais
    };

    const getColorFromBiasChange = (biasChange) => {
        const opacity = Math.min(1, Math.abs(biasChange) * 10); // Ajuster le facteur de 10 selon la sensibilité souhaitée
        return biasChange > 0 
            ? `rgba(0, 255, 0, ${opacity})`  // Vert pour augmentation
            : `rgba(255, 0, 0, ${opacity})`; // Rouge pour diminution
    };
    const getColorFromBias = (bias) => {
        // Utilisez la fonction Math.tanh pour adoucir l'échelle d'opacité et limitez-la à 1
        // Multipliez bias par un facteur pour augmenter la vitesse de saturation de la couleur
        const opacity = Math.min(1, Math.abs(Math.tanh(bias * 5))); // Multiplication par 5 pour augmenter la sensibilité
    
        return bias > 0 
            ? `rgba(0, 255, 0, ${opacity})` // Green for positive bias
            : `rgba(255, 0, 0, ${opacity})`; // Red for negative bias
    };
    
    const handleEpochChange = (event) => {
        setCurrentEpoch(parseInt(event.target.value));
        stopAnimation();
    };

    const handleNextEpoch = () => {
        if (currentEpochRef.current < trainingData.length - 1) {
            setCurrentEpoch(currentEpochRef.current + 1);
        } else {
            stopAnimation(); // Automatically stop animation at the last epoch
        }
    };

    const startAnimation = () => {
        if (!isAnimating) {
            animationIntervalId.current = setInterval(handleNextEpoch, 100);
            setIsAnimating(true);
        }
    };

    const stopAnimation = () => {
        clearInterval(animationIntervalId.current);
        animationIntervalId.current = null;
        setIsAnimating(false);
    };

    const toggleAnimation = () => {
        if (isAnimating) {
            stopAnimation();
        } else {
            startAnimation();
        }
    };


    const svgWidth = 800;
    const svgHeight = 400;
    const inputLayerSize = inputMode === 'NOTE_ONLY' ? 1 : 10;
    const outputLayerSize = 5;  // Assuming the output layer size from your model

    const getColorFromWeightChange = (currentWeight, previousWeight) => {
        if (!previousWeight) {
            return 'rgba(255, 255, 255, 0.5)'; // Gris clair si aucune donnée précédente n'est disponible
        }
        const change = currentWeight - previousWeight;
        // Utiliser un facteur de mise à l'échelle plus contrôlé pour éviter les couleurs extrêmes
        const scaledChange = Math.tanh(change); // Utilisation de la tangente hyperbolique pour adoucir l'effet
        const intensity = Math.abs(scaledChange) * 255;
    
        if (change > 0) {
            return `rgb(0, ${Math.floor(intensity)}, 0)`; // Vert pour une augmentation
        } else if (change < 0) {
            return `rgb(${Math.floor(intensity)}, 0, 0)`; // Rouge pour une diminution
        }
        return 'grey'; // Gris si aucun changement
    };
    
    const getColorFromCumulativeChange = (cumulativeChange) => {
        const intensity = Math.min(150, Math.abs(cumulativeChange) * 256); // Utiliser 128 pour ajuster la sensibilité
        if (cumulativeChange > 0) {
            return `rgb(0, ${Math.floor(intensity)}, 0)`; // Vert pour augmentation cumulative
        } else {
            return `rgb(${Math.floor(intensity)}, 0, 0)`; // Rouge pour diminution cumulative
        }
    };
    const getColorFromWeight = (weight) => {
        if (weight === undefined) {
        return 'rgba(255, 255, 255, 0.5)';
        }
        return `rgb(${Math.min(255, Math.floor(255 * Math.max(0, weight) + 50))}, ${Math.min(255, Math.floor(255 * Math.max(0, -weight) + 50))}, 0)`;

    };

    const epochLayers = trainingData[currentEpoch] || [];

    const layerSpacing = svgWidth / (epochLayers.length + 1);  // +2 for input and output layers

    return (
        <>
        <svg width={svgWidth} height={svgHeight} style={{ border: '1px solid black' }}>
            {new Array(inputLayerSize).fill(0).map((_, inputIndex) => {
            const yInput = (inputIndex + 1) * svgHeight / (inputLayerSize + 1);
            const xInput = layerSpacing;
            return (
                <circle key={`input-neuron-${inputIndex}`} cx={xInput} cy={yInput} r={10} fill="blue" />
            );
            })}
            {epochLayers.map((layer, layerIndex) => {
            const x = (layerIndex ) * layerSpacing ;
            if (!layer.weights) return null;
            
            const neuronSpacing = svgHeight / (layer.weights.length + 1);
            return (
                <g key={layerIndex}>
                {layer.weights.map((neuronWeights, neuronIdx) => {
                    const y = (neuronIdx + 1) * neuronSpacing;
                    let lines = [];
                    const bias = layer.biases && layer.biases[neuronIdx] ? layer.biases[neuronIdx] : 0;
                    const biasColor = getColorFromBias(bias);
                    if (layerIndex === 0) {return null;
                        
                
                    };
                    if (layerIndex === 2) { // Assuming layerIndex 1 is the first after embedding
                        lines = new Array(inputLayerSize).fill(0).map((_, idx) => {
                        const yInput = (idx + 1) * svgHeight / (inputLayerSize + 1);
                        return (
                            <line key={`input-to-layer1-link-${idx}-${neuronIdx}`} x1={layerSpacing} y1={yInput} x2={x} y2={y} stroke="green" strokeWidth="2" />
                        );
                        });
                    }
                    if (layerIndex < epochLayers.length - 1 && epochLayers[layerIndex + 1].weights) {
                    const nextLayer = epochLayers[layerIndex + 1];
                    const nextX = (layerIndex +1) * layerSpacing
                    const nextNeuronSpacing = svgHeight / (nextLayer.weights.length + 1);
                    lines = lines.concat(neuronWeights.map((weight, linkIdx) => {
                        const y2 = (linkIdx + 1) * nextNeuronSpacing;
                        const cumulativeChange = cumulativeChanges[layerIndex]?.[neuronIdx]?.[linkIdx] || 0;
                        const previousWeight = previousWeights[layerIndex]?.[neuronIdx]?.[linkIdx] ?? null;
                        console.log("NewColor = ", getColorFromCumulativeChange(cumulativeChange))
                        if (cumulativeChange === 0) return null;
                        return (
                        <line key={`link-${layerIndex}-${neuronIdx}-${linkIdx}`} x1={x} y1={y} x2={nextX} y2={y2} stroke={getColorFromCumulativeChange(cumulativeChange)} strokeWidth="2" />
                        );
                    }));
                    }
                    return (
                    <g key={neuronIdx}>
                        {lines}
                        <circle cx={x} cy={y} r={10} fill="white" />
                        <circle cx={x} cy={y} r={5} fill={biasColor} />  
                    </g>
                    );
                })}
                </g>
            );
            })}
            {/* Output layer visualization */}
            {epochLayers.length > 0 && (    
            <g>
                {epochLayers[epochLayers.length - 1].weights.map((neuronWeights, neuronIndex) => {
                const y1 = (neuronIndex + 1) * svgHeight / (epochLayers[epochLayers.length - 1].weights.length + 1);
                return neuronWeights.map((weight, outputIdx) => {
                    const x1 = (epochLayers.length-1) * layerSpacing;
                    const x2 = svgWidth - layerSpacing;
                    const y2 = (outputIdx + 1) * svgHeight / (outputLayerSize + 1);
                    const cumulativeChange = cumulativeChanges[epochLayers.length - 1]?.[neuronIndex]?.[outputIdx] || 0
                    const bias = epochLayers[epochLayers.length - 1].biases && epochLayers[epochLayers.length - 1].biases[neuronIndex] ? epochLayers[epochLayers.length - 1].biases[neuronIndex] : 0;
                    const biasColor = getColorFromBias(bias);
                    
                    
                    
                    return (
                    <>
                    <line key={`output-line-${neuronIndex}-${outputIdx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={getColorFromCumulativeChange(cumulativeChange)} strokeWidth="2" />
                    <circle cx={x2} cy={y2} r={10} fill="white" fillOpacity="0.3" />
                    <circle cx={x2} cy={y2} r={5} fill={biasColor} />
                    </>
                    );
                });
                })}
            </g>
            )}
        </svg>
        <div>
                <input
                    type="range"
                    min="0"
                    max={trainingData.length - 1}
                    value={currentEpoch}
                    onChange={handleEpochChange}
                    style={{ width: '50%' }}
                />
            </div>
        <div>
        <button onClick={() => setCurrentEpoch(Math.max(0, currentEpoch - 1))} disabled={currentEpoch === 0}>Previous Epoch</button>
            <button onClick={handleNextEpoch} disabled={currentEpoch === trainingData.length - 1}>Next Epoch</button>
            <button onClick={toggleAnimation}>{isAnimating ? 'Stop Animation' : 'Start Animation'}</button>        </div>
        <div style={{ marginTop: '10px' }}>
            <span>Current Epoch: {currentEpoch + 1} / {trainingData.length}</span>
        </div>
        </>
    );
    };

    export default NeuralNetworkVisualizationTraining;
