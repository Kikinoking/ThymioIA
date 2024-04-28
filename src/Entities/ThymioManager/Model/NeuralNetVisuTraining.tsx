    import React, { useState, useEffect } from 'react';

    const NeuralNetworkVisualizationTraining = ({ trainingData, inputMode }) => {
        
    const [currentEpoch, setCurrentEpoch] = useState(0);
    const [previousWeights, setPreviousWeights] = useState([]);
    const [currentWeights, setCurrentWeights] = useState([]);
    useEffect(() => {
        // Update weights on epoch change
        if (trainingData[currentEpoch]) {
            const newWeights = trainingData[currentEpoch].map(layer => layer.weights);
            if (currentEpoch > 0) { // Update previous weights only if it's not the first epoch
                setPreviousWeights(currentWeights);
            }
            setCurrentWeights(newWeights);
        }
    }, [currentEpoch, trainingData]);

    const svgWidth = 800;
    const svgHeight = 400;
    const inputLayerSize = inputMode === 'NOTE_ONLY' ? 1 : 10;
    const outputLayerSize = 5;  // Assuming the output layer size from your model

    const getColorFromWeightChange = (currentWeight, previousWeight) => {
        if (!previousWeight) {
            return 'grey';  // Grey if no previous data for comparison
        }
        const change = currentWeight - previousWeight;
        if (change > 0) {
            return 'rgb(0, 255, 0)';  // Green for increase
        } else if (change < 0) {
            return 'rgb(255, 0, 0)';  // Red for decrease
        }
        return 'grey';  // Grey if no change
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
                <circle key={`input-neuron-${inputIndex}`} cx={xInput} cy={yInput} r={5} fill="blue" />
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
                        const previousWeight = previousWeights[layerIndex]?.[neuronIdx]?.[linkIdx] ?? null;
                        return (
                        <line key={`link-${layerIndex}-${neuronIdx}-${linkIdx}`} x1={x} y1={y} x2={nextX} y2={y2} stroke={getColorFromWeightChange(weight, previousWeight)} strokeWidth="2" />
                        );
                    }));
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
            {/* Output layer visualization */}
            {epochLayers.length > 0 && (    
            <g>
                {epochLayers[epochLayers.length - 1].weights.map((neuronWeights, neuronIndex) => {
                const y1 = (neuronIndex + 1) * svgHeight / (epochLayers[epochLayers.length - 1].weights.length + 1);
                return neuronWeights.map((weight, outputIdx) => {
                    const x1 = (epochLayers.length-1) * layerSpacing;
                    const x2 = svgWidth - layerSpacing;
                    const y2 = (outputIdx + 1) * svgHeight / (outputLayerSize + 1);
                    
                    
                    return (
                    <><line key={`output-line-${neuronIndex}-${outputIdx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={getColorFromWeight(weight)} strokeWidth="2" />
                    <circle key={`output-neuron-${outputIdx}`} cx={x2} cy={y2} r={10} fill="red" /></>
                    );
                });
                })}
            </g>
            )}
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
