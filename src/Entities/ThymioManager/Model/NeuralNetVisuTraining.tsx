    /**
 * NeuralNetworkVisualizationTraining.tsx
 * 
 * A component for visualizing the training process of the network. It dynamically renders the neural network's layers,
 * weights, and biases based on training data across epochs. This visualization includes options to animate the transition
 * between epochs, adjust the current epoch via a slider, and display changes in network weights and biases over time.
 * Its not the same component used for testing!
 */

    import { useState, useEffect, useRef } from 'react';
    import * as React from 'react';
    import { useTranslation } from 'react-i18next';
    import Svgaction1 from '../../../assets/actionsicons/STOPStatic.png';
    import Svgaction2 from '../../../assets/actionsicons/ForwardStatic.png';
    import Svgaction3 from '../../../assets/actionsicons/BackStaticV2.png';
    import Svgaction4 from '../../../assets/actionsicons/RightStatic.png';
    import Svgaction5 from '../../../assets/actionsicons/LeftStatic.png';

    const NeuralNetworkVisualizationTraining = ({ trainingData, inputMode, showBiases }) => {
        
        const { t } = useTranslation();
    const [currentEpoch, setCurrentEpoch] = useState(0);
    const [previousWeights, setPreviousWeights] = useState([]);
    const [currentWeights, setCurrentWeights] = useState([]);
    const [cumulativeChanges, setCumulativeChanges] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationIntervalId = useRef(null);
    const currentEpochRef = useRef(0); // Using ref to track the current epoch
    const [cumulativeBiasChanges, setCumulativeBiasChanges] = useState([]);

    const sliderRef = useRef(null); 

    const CHANGE_THRESHOLD = 0.01; // for weighs, training visualisation
    useEffect(() => {
        const updateSliderBackground = () => {
            const slider = sliderRef.current;
            if (slider) {
                const value = parseInt(slider.value, 10);
                const percentage = ((value - slider.min) / (slider.max - slider.min)) * 100;
                slider.style.background = `linear-gradient(to right, #4e48ff ${percentage}%, #0f09bf ${percentage}%)`;
            }
        };

        const slider = sliderRef.current;
        if (slider) {
            updateSliderBackground(); //applies style update
            slider.addEventListener('input', updateSliderBackground); 
        }

        // Cleanup, remove listener when not needed anymore
        return () => {
            if (slider) {
                slider.removeEventListener('input', updateSliderBackground);
            }
        };
    }, [currentEpoch]);

    useEffect(() => {
        if (sliderRef.current) {
            sliderRef.current.value = currentEpoch;
        }
    }, [currentEpoch]);

    useEffect(() => {
        currentEpochRef.current = currentEpoch; // Update ref whenever state changes
    }, [currentEpoch]);

    useEffect(() => {
        if (trainingData && trainingData.length > 0 && !isAnimating) {
            setCurrentEpoch(0);
          //startAnimation(); //start animation auto. Imo its better if the user starts it manually
        }
        
        //stop anim when component deleted
        return () => {
          stopAnimation();
        };
      }, [trainingData]);
      
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
        setCumulativeBiasChanges(newCumulativeBiasChanges); //Update biases
    };

    const getColorFromBiasChange = (biasChange) => {
        const opacity = Math.min(1, Math.abs(biasChange) * 10); //opacity handtuned
        return biasChange > 0 
            ? `rgba(0, 255, 0, ${opacity})`  // Green for increase
            : `rgba(255, 0, 0, ${opacity})`; // Red for decrease
    };
    const getColorFromBias = (bias) => {
        // Math.tan for opacity, limited to 1 upper bound, then scaled by a factor of 5 for sensibility.
        const opacity = Math.min(1, Math.abs(Math.tanh(bias * 5))); 
    
        return bias > 0 
            ? `rgba(0, 255, 0, ${opacity})` // Green for positive bias
            : `rgba(255, 0, 0, ${opacity})`; // Red for negative bias
    };
    
    const handleEpochChange = (event) => {
        setCurrentEpoch(parseInt(event.target.value));
        stopAnimation();
    };

    const handleNextEpoch = () => {
     
        const nextEpoch = currentEpochRef.current + 3;
    
        
        if (nextEpoch < trainingData.length) {
            setCurrentEpoch(nextEpoch);
            setPreviousWeights(currentWeights);  // Updates weights
            animationIntervalId.current = requestAnimationFrame(handleNextEpoch);
        } else {
           
            setCurrentEpoch(trainingData.length - 1);
            stopAnimation();
        }
    };
    
    const startAnimation = () => {
        if (!isAnimating) {
            animationIntervalId.current = requestAnimationFrame(handleNextEpoch);
            setIsAnimating(true);
        }
    };
    
    const stopAnimation = () => {
        cancelAnimationFrame(animationIntervalId.current);
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
    const outputLayerSize = 5;  

   
    
    const getColorFromCumulativeChange = (cumulativeChange) => {
        const intensity = Math.min(150, Math.abs(cumulativeChange) * 256); 
        if (cumulativeChange > 0) {
            return `rgb(0, ${Math.floor(intensity)}, 0)`; //Green for cumulative increase.
        } else {
            return `rgb(${Math.floor(intensity)}, 0, 0)`; // Red for decrease
        }
    };
    const getColorFromWeight = (weight) => {
        if (weight === undefined) {
            return 'rgba(255, 255, 255, 0.5)'; // default color, should never happen
        }
        // Calcul de l'intensité des couleurs en amplifiant les variations
        const red = Math.min(255, Math.floor(255 * Math.max(0, -weight) * 1.5)); // amplifies neg w.
        const green = Math.min(255, Math.floor(255 * Math.max(0, weight) * 1.5)); // Amplifies pos w.
    
        return `rgb(${red}, ${green}, 0)`;
    };

    const epochLayers = trainingData[currentEpoch] || [];

    const layerSpacing = svgWidth / (epochLayers.length + 1);  // +1 for input and output layers

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg width={svgWidth} height={svgHeight} style={{ border: 'none' }}>
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
                    console.log(`Layer ${layerIndex} Neuron ${neuronIdx} Bias:`, bias);
                    const biasColor = getColorFromBias(bias);
                    if (layerIndex === 0) {return null;
                        
                
                    };
                    if (layerIndex === 2) { //layerIndex 2 is the first after embedding
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
                        const weightChange = previousWeight ? Math.abs(weight - previousWeight) : null;
                        console.log("NewColor = ", getColorFromCumulativeChange(cumulativeChange))
                        let linkColor;
                        if (weightChange && weightChange > CHANGE_THRESHOLD) {
                            const cumulativeChange = cumulativeChanges[layerIndex][neuronIdx][linkIdx];
                            linkColor = getColorFromCumulativeChange(cumulativeChange);
                        } else {
                            linkColor = getColorFromWeight(weight);
                        }
                        return (
                        <line key={`link-${layerIndex}-${neuronIdx}-${linkIdx}`} x1={x} y1={y} x2={nextX} y2={y2} stroke={getColorFromWeight(weight)} strokeWidth="2" />
                        );
                    }));
                    }
                    return (
                    <g key={neuronIdx}>
                        {lines}
                        <circle cx={x} cy={y} r={10} fill="white" />
                        {showBiases && <circle cx={x} cy={y} r={5} fill={biasColor} />  }
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
                    const svgX = x2 + 20; 
                    const svgSize = 60; 
                    const svgImages = [Svgaction1, Svgaction2, Svgaction3, Svgaction4, Svgaction5];
                    const svgSrc = svgImages[outputIdx % svgImages.length];
                    const cumulativeChange = cumulativeChanges[epochLayers.length - 1]?.[neuronIndex]?.[outputIdx] || 0
                    const bias = epochLayers[epochLayers.length - 1].biases && epochLayers[epochLayers.length - 1].biases[neuronIndex] ? epochLayers[epochLayers.length - 1].biases[neuronIndex] : 0;
                    const biasColor = getColorFromBias(bias);
                    
                    
                    
                    return ( //draw output layer
                        <React.Fragment key={`fragment-${neuronIndex}-${outputIdx}`}>
                        <line key={`output-line-${neuronIndex}-${outputIdx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={getColorFromWeight(weight)} strokeWidth="2" />
                        {showBiases={showBiases} && <circle cx={x2} cy={y2} r={5} fill={biasColor} />}
                        <circle cx={x2} cy={y2} r={10} fill="orange" />
                        
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
                            stroke="white"
                            strokeWidth="1.5"
                        />
                    </React.Fragment>
                    );
                });
                })}
            </g>
            )}
        </svg> {/* Buttons and slider below, to interact with animation*/}
        <div style={{ marginTop: '2px', width: '70%', display: 'flex', justifyContent: 'space-around' }}>
                <input
                    ref={sliderRef}
                    type="range"
                    min="0"
                    max={trainingData.length - 1}
                    value={currentEpoch}
                    onChange={handleEpochChange}
                    style={{ width: '80%' }}
                    aria-label={t('epoch_slider')}
                />
            </div>
        <div>
        <div style={{ marginTop: '1 0px' }}> 
                <button onClick={() => setCurrentEpoch(Math.max(0, currentEpoch - 1))} disabled={currentEpoch === 0}>{t('previous_epoch')}</button>
                <button onClick={() => setCurrentEpoch(Math.min(currentEpoch + 1, trainingData.length - 1))}>{t('next_epoch')}</button>
                <button onClick={toggleAnimation}>{isAnimating ? t('stop_animation') : t('start_animation')}</button> 
            </div>
                  </div>
        <div style={{ marginTop: '10px' }}>
            <span>{t('current_epoch')} {currentEpoch + 1} / {trainingData.length}</span>
        </div>
        </div>
    );
    };

    export default NeuralNetworkVisualizationTraining;
