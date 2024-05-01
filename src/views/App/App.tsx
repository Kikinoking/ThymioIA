import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart ,registerables} from 'chart.js';
import './App.css';
import { thymioManagerFactory } from '../../Entities/ThymioManager';
import { observer } from 'mobx-react';
import { noteToNumberMapping } from '../../noteMapping';
import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import BarChart from './BarChart';
import ThymioSVG from '../ThymioSVG';
import Piano from './Piano'
import MusicalStaff from './MusicalStaff'; // Assurez-vous que le chemin est correct
import './Menu.css';
import SettingsIcon from '../../assets/settings.svg'
import * as tf from '@tensorflow/tfjs';
import stopGif from '../../assets/actionsicons/Stopgif.gif'
import forwardGif from '../../assets/actionsicons/animForwardV2.gif';
import backwardGif from '../../assets/actionsicons/animBackward.gif';
import leftGif from '../../assets/actionsicons/AnimLeft.gif';
import rightGif from '../../assets/actionsicons/AnimRight.gif';
import HelpIcon from '../../assets/help.svg';
import stopStatic from '../../assets/actionsicons/STOPStatic.png';
import forwardStatic from '../../assets/actionsicons/ForwardStatic.png';
import backwardStatic from '../../assets/actionsicons/BackStatic.png';
import leftStatic from '../../assets/actionsicons/LeftStatic.png';
import rightStatic from '../../assets/actionsicons/RightStatic.png';
import NeuralNetworkVisualization from '../../Entities/ThymioManager/Model/NeuralNetworkVisualization';
import NeuralNetworkVisualizationTraining from '../../Entities/ThymioManager/Model/NeuralNetVisuTraining'
import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import NavigationBar from './NavigationBar';




Chart.register(...registerables);

//Map tones to a given number so that data is in a good format for NN
const user = thymioManagerFactory({ user: 'AllUser', activity: 'ThymioIA', hosts: ['localhost'] }); 


/**
 * Convertit une fréquence en note musicale.
 * @param {number} frequency - La fréquence à convertir en note musicale.
 * @returns {string} La note musicale correspondante à la fréquence donnée.
 */
function frequencyToNoteNumber(frequency) {
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);
  if (frequency === 0) return null; // Gérer le cas zéro
  let h = Math.round(12 * Math.log2(frequency / C0));
  let octave = Math.floor(h / 12);
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  let n = h % 12;
  let note = noteNames[n] + octave; // Assurez-vous de concaténer ici directement
  //console.log(`Converted frequency ${frequency} to note ${note}`);
  return note;
}




const App = observer(() => {
  const [note, setNote] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const chartRef = useRef(null);
  const [chart, setChart] = useState(null);
  const [maxFreq, setMaxFreq] = useState(null);
  const [isContinuousRecording, setIsContinuousRecording] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);

  const [maxDetectedFreq, setMaxDetectedFreq] = useState(null); //USed when recording not continuous
  const [noteRecording, setNoteRecording] = useState(0);

  const [threshold, setThreshold] = useState(200);



  const [recordDuration, setRecordDuration] = useState(5000);  //Record duration

  const [robots, setRobots] = useState<string[]>([]);
  const [controledRobot, setControledRobot] = useState<string>('');
  const [trainer, setTrainer] = useState<{ uuid: string; action: string; captors: number[];note?: string }[]>([]);
  const [mode, setMode] = useState<'TRAIN' | 'PREDICT'>('TRAIN');

  const [isWinnerTakesAll, setIsWinnerTakesAll] = useState(true); //Toggle winner-take-all/probabilistic decision

  const [inputMode, setInputMode] = useState('CAPTORS_AND_NOTE'); // 'CAPTORS_AND_NOTE' ou 'NOTE_ONLY'

  const [silentMode, setSilentMode] = useState(false); //Toggle visual piano
  const [showSettings, setShowSettings] = useState(false);

  const settingsButtonRef = useRef(null); // Référence pour le bouton Settings

  const [showPopup, setShowPopup] = useState(false); //utilisé pour le popup recording

  const menuRef = useRef(null); // Référence pour le menu

  const [isTutorialActive, setIsTutorialActive] = useState(false); //For Tutorial

  const [trainingData, setTrainingData] = useState([]); //For visualisation of the training

  const [activations, setActivations] = useState([]); // For testing visualisation


  const [showConnectingPopup, setShowConnectingPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");     // Delay when connecting using dongle.

  const { t, i18n } = useTranslation();


  
  const toggleTutorial = () => {
    setIsTutorialActive(!isTutorialActive);
  };
  const handleNoteChange = (note: string) => {
    setCurrentNote(note); // Update the note
  };
//For bar chart$

  const [predictions, setPredictions] = React.useState([0.2, 0.3, 0.1, 0.15, 0.25]);
 
  const labels = [ t('action_stop'),
  t('action_forward'),
  t('action_backward'),
  t('action_right'),
  t('action_left')]; 

  const [activeTab, setActiveTab] = useState('Training');
  
  const [currentState, setCurrentState] = useState('Title');

  const [run, setRun] = useState(false);//Used for tutorial
  const [steps, setSteps] = useState<Step[]>([]);

  const [model, setModel] = useState<tf.Sequential | null>(null);
  const [loading, setLoading] = useState(false);

  
  const [currentEpoch, setCurrentEpoch] = useState(0);


  const [visitedStates, setVisitedStates] = useState({'Title': true });
  const [isExecuteClicked, setIsExecuteClicked] = useState(false);
  const [isTrainingComponentLoaded, setIsTrainingComponentLoaded] = useState(false);


  const [showInstructions, setShowInstructions] = useState(true);//To show/hide instruction to make room for visualisation training
  const [isTrainingComplete, setIsTrainingComplete] = useState(false); //Wait end of training before visualisation of NN

  const handleSetCurrentState = (newState) => {
    console.log("Updating state from", currentState, "to", newState); // Debugging current state update
    setCurrentState(newState);
    setVisitedStates(prev => {
      const updatedVisitedStates = { ...prev, [newState]: true };
      console.log("Visited States: ", updatedVisitedStates); // Debugging visited states
      return updatedVisitedStates;
    });
  };
  

// Fonction pour charger le modèle
const loadModel = async () => {
    if (!loading && !model) {
        setLoading(true);
        const loadedModel = await user.getModel();
        setModel(loadedModel);
        setLoading(false);
    }
};

  const STATES = {
    Title: 'Title',
    ConsigneTraining: 'ConsigneTraining',
    PlayNote: 'PlayNote',
    MapAction: 'MapAction',
    ConsigneTesting: 'ConsigneTesting',
    Testing: 'Testing',
    CurrentModelTest: 'CurrentModelTest'
  };
  const STATES_ARRAY = Object.keys(STATES).map(key => STATES[key]);
  const locale = {
    back: t('joyride.back'),
    close: t('joyride.close'),
    last: t('joyride.last'),
    next: t('joyride.next'),
    skip: t('joyride.skip')
  };

  
  
  const handleExecute = async () => {
    await onExecute();
    setShowInstructions(false);
    setIsExecuteClicked(true);
    setIsTrainingComplete(true);
  };

  useEffect(() => {
    if (isExecuteClicked) {
      setTimeout(() => {
        setIsTrainingComponentLoaded(true);
      }, 3000);  // Simuler un délai de chargement
    }
  }, [isExecuteClicked]);

  const Component = () => {
    const { t } = useTranslation();}


  const switchTab = (tabName) => {
    // Appeler stopExecutionAndReset si on change vers l'onglet 'Training'
    if (tabName === 'Training') {
      stopExecutionAndReset();
    }
    setActiveTab(tabName);
  };

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };
  const startTour = () => {
    requestAnimationFrame(() => {
      setRun(true);
    });
    
  };

  useEffect(() => {
    switch (currentState) {
      case 'Title':
        setSteps([
          
          {
            target: '.getRobots-button',
            content: t('tooltip_get_robots'),
            placement: 'left',
            disableBeacon: true
          }
        ]);
        break;
      case 'ConsigneTraining':
      setSteps([
        {
          target: '.use-captors-and-note-button', // Assurez-vous que le bouton a cette classe
          content: t('tooltip_use_captors_and_note'),
          placement: 'left',
          disableBeacon: true
        },
        {
          target: '.use-note-only-button', // Assurez-vous que le bouton a cette classe
          content: t('tooltip_use_note_only'),
          placement: 'right'
        }
      ]);
      break;
      case 'PlayNote':
      setSteps([
        {
          target: '.start-recording-button', 
          content: t('tooltip_start_recording'),
          placement: 'top',
          disableBeacon: true
        },
        {
          target: '.piano', 
          content: t('piano-component-train'),
          placement: 'left'
        },
        {
          target: '.thymio-svg-component', 
          content: t('tooltip_thymio_svg'),
          placement: 'left'
        },
        {
          target: '.musical-staff-component', 
          content: t('tooltip_musical_staff'),
          placement: 'right'
        },
        {
          target: '.go-to-map-action-button', 
          content: t('tooltip_go_to_map_action'),
          placement: 'bottom'
        }
      ]);
      break;
      case 'MapAction':
      setSteps([
        {
          target: '.actions-container', // Assurez-vous que le conteneur des boutons a cette classe
          content: t('tooltip_map_actions'),
          placement: 'top',
          disableBeacon: true,
          styles: {
            options: {
              zIndex: 10000
            }
          }
        }
      ]);
      break;
      case 'CurrentModelTrain': 
        setSteps([
          {
            target: '.thymio-container',
            content: t('tooltip_thymio_svg'),
            placement: 'top',
            disableBeacon: true
          },
          {
            target: 'th',
            content: t('tooltip_action_column'),
            placement: 'top',
          },
          {
            target: 'th + th',
            content: t('tooltip_captors_column'),
            placement: 'top',
          },
          {
            target: 'th + th + th',
            content: t('tooltip_note_column'),
            placement: 'top',
          },
          {
            target: '.map-more-actions-button',
            content: t('tooltip_map_more_actions'),
            placement: 'bottom',
          },
          {
            target: '.save-model-button',
            content: t('tooltip_save_model'),
            placement: 'bottom',
          },
          {
            target: '.test-model-button',
            content: t('tooltip_test_model'),
            placement: 'bottom',
          }
        ]);
        break;
        case 'Testing':
        setSteps([
          {
            target: '.execute-btn',
            content: t('tooltip_execute'),
            placement: 'top',
            disableBeacon: true
          },
          {
            target: '.toggle-recording-btn',
            content: t('tooltip_toggle_recording_musical_staff'),
            placement: 'right',
          },
          {
            target: '.piano',
            content: t('tooltip_piano'),
            placement: 'left',
          },
          {
            target: '.thymio-svg',
            content: t('tooltip_thymio_svg'),
            placement: 'top',
          },
          {
            target: '.bar-chart-container',
            content: t('tooltip_bar_chart'),
            placement: 'bottom',
          },
          {
            target: '.load-model-btn',
            content: t('tooltip_load_model'),
            placement: 'left',
          },
          {
            target: '.visualize-nn-btn',
            content: t('tooltip_visualize_nn'),
            placement: 'right',
          },
          {
            target: '.stop-testing-btn',
            content: t('tooltip_stop_testing'),
            placement: 'left',
          },
          {
            target: '.switch-decision-btn',
            content: t('tooltip_switch_decision'),
            placement: 'top',
          },
          {
            target: '.reset-training-btn',
            content: t('tooltip_reset_training'),
            placement: 'right',
          }
        ]);
      
      
    }
  }, [currentState, t]); 

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  const toggleSilentMode = () => {
    setSilentMode(prev => !prev); // Bascule le mode Silent
  };

  // Gérer les clics à l'extérieur du menu pour fermer
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          !settingsButtonRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); 

  
  
  




  useEffect(() => {
    if (chartRef.current && !chart) {
      const newChart = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Amplitude (dB)',
            data: [],
            borderColor: 'rgb(247, 17, 56)',
            tension: 0.25
          }]
        },
        options: {
          scales: {
            x: {
              type: 'linear', // Assurez-vous que l'axe X est de type linéaire
              position: 'bottom', // Positionne l'axe en bas
              min: 200, // Début des graduations à 200 Hz
              max: 2000,
              title: {
                display: true,
                text: 'Frequency (Hz)',
                color: '#dfe8e8',
                font: {
                  family: 'Roboto',
                  size: 20,
                  
                },
                
              },
              ticks: {
                stepSize: 200,
                color: '#dfe8e8', // Couleur des ticks/étiquettes sur l'axe X
              },
              grid: {
                display : true,
                color: 'rgba(79, 77, 77, 0.2)', // Couleur des lignes de grille pour l'axe X
              },
            },
            y: {
              title: {
                display: true,
                text: 'Amplitude (dB)',
                color: '#dfe8e8',
                font: {
                  family: 'Roboto',
                  size: 20,
                  
                
                }
                
              },ticks: {
                color: '#dfe8e8', // Couleur des ticks/étiquettes sur l'axe X
              },
              grid: {
                display : true,
                color: 'rgba(79, 77, 77, 0.2)', // Couleur des lignes de grille pour l'axe X
              },
            }
          },
          plugins: {
            
            legend: {
              display: true,
              labels: {
          
                  color: '#dfe8e8', // Couleur du texte des légendes
                font: {
                  family: 'Roboto',
                  size: 20
                }
              }
            }
          }
        }
      });
      setChart(newChart);
    }
  }, [chart, chartRef.current   ]);

  const toggleContinuousRecording = () => {
    // Si on démarre l'enregistrement continu, arrête l'enregistrement audio si actif
    if (!isContinuousRecording && isRecording) {
      setIsRecording(false);  
    }

    setIsContinuousRecording(!isContinuousRecording);

    if (!isContinuousRecording) {
      startContinuousRecording();
    } else {
      stopContinuousRecording();
    }
  };

  const startContinuousRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia n'est pas supporté par ce navigateur.");
      return;
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setAudioStream(stream);

    // Initialisation et stockage de audioContext dans le ref
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    
    analyserRef.current = audioContextRef.current.createAnalyser();
    source.connect(analyserRef.current);
    
    analyserRef.current.fftSize = 4096;
    setIsContinuousRecording(true);
  };

  const handleModeChange = async (newMode) => {
    setInputMode(newMode); // Update state to new mode
    if(user){
      await user.reinitializeModel(newMode); // Reinitialize the model on the backend
      console.log("Model reinitialized for mode:", newMode);
      }
    handleSetCurrentState(STATES.PlayNote);
  };

  useEffect(() => {
    
    // Vérifiez que audioContext et analyser sont définis avant de démarrer getFrequencies
    if (isContinuousRecording && audioContextRef.current && analyserRef.current) {
      
       // Vous pouvez ajuster le seuil comme nécessaire
        getFrequencies();
      
    } 
  }, [isContinuousRecording, audioContextRef.current, analyserRef.current]);
  
  
  const getFrequencies = () => {
    if (!isContinuousRecording || !analyserRef.current || !audioContextRef.current) {
      return;
    }
  
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
  
    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }
  
    const maxFrequency = maxIndex * audioContextRef.current.sampleRate / analyserRef.current.fftSize;
   
    if (maxFrequency > 0 && maxValue > threshold) { // Ajout de la vérification de la valeur maximale par rapport au seuil
      setMaxFreq(maxFrequency);
      const noteDetected = frequencyToNoteNumber(maxFrequency);
      setNote(noteDetected);
    } 
  
    if (isContinuousRecording) {
      requestAnimationFrame(getFrequencies);
    }
  };
  

  useEffect(() => {
    if (isContinuousRecording && analyserRef.current) {
      getFrequencies();
    }
  }, [isContinuousRecording]);
  
  const stopContinuousRecording = () => {
    console.log("Arrêt de l'enregistrement continu.");
    setIsContinuousRecording(false);
  
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
  
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  
    setMaxFreq(null);
  };
  

  const updateChart = (frequencies, amplitudes) => {
  if (chart) {
    chart.data.labels = frequencies;
    chart.data.datasets[0].data = amplitudes.map(dB => dB === -Infinity ? 0 : dB); // Convertir -Infinity en 0 pour l'affichage
    chart.update();
  }
};

  const startRecording = async () => {
   if (isContinuousRecording) {
    stopContinuousRecording();
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("getUserMedia n'est pas supporté par ce navigateur.");
    return;
  }
  try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);

  setIsRecording(true);
  setShowPopup(true)
  let audioChunks = [];
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.start();

  mediaRecorder.onstop = async () => {
    setIsRecording(false);
    setShowPopup(false); 
    const audioBlob = new Blob(audioChunks, { 'type': 'audio/wav; codecs=opus' });
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    const newAudioUrl = URL.createObjectURL(audioBlob);
    setAudioUrl(newAudioUrl);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    source.connect(analyser);
    analyser.fftSize = 4096;

    // Assurez-vous que start() est appelé une seule fois par instance de source.
    source.start(0);
    
    source.onended = () => {
  const dataArray = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(dataArray);

  let frequencies = dataArray.map((_, index) => index * audioContext.sampleRate / analyser.fftSize);
  let amplitudes = dataArray.map(value => value === -Infinity ? 0 : value);

  // Filtrer pour les fréquences entre 200 Hz et 2 kHz
  let filteredFrequencies = [];
  let filteredAmplitudes = [];
  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= 200 && frequencies[i] <= 2000) {
      filteredFrequencies.push(frequencies[i]);
      filteredAmplitudes.push(amplitudes[i]);
    }
  }

  let maxIndex = filteredAmplitudes.indexOf(Math.max(...filteredAmplitudes));
  let maxFrequency = filteredFrequencies[maxIndex];
  setMaxDetectedFreq(maxFrequency);
  const detectedNote = frequencyToNoteNumber(maxFrequency);
  
  setNoteRecording(detectedNote);

  // Mise à jour du graphique avec seulement les fréquences filtrées
  updateChart(filteredFrequencies, filteredAmplitudes);
};
  };

  setTimeout(() => {
    mediaRecorder.stop();
  }, recordDuration);
} catch (error) {
  console.error("Erreur lors de la tentative d'accès au micro:", error);
  setIsRecording(false);
  setShowPopup(false); // S'assurer que le popup est masqué en cas d'erreur
  alert(t('mic_error')); // Informer l'utilisateur
}
}
;

  const onClickGetRobots = async () => {
    const _robots = await user.getRobotsUuids();
    setRobots(_robots);
  };

  const onSelectRobot = async (robotUuid: string) => {
    user.takeControl(robotUuid);
    
    setPopupMessage(t('connecting_robot')); 
    setShowConnectingPopup(true);
    setControledRobot(robotUuid);
    setTimeout(() => {
      setShowConnectingPopup(false); // Cacher le popup après 3 secondes
      handleSetCurrentState(STATES.ConsigneTraining); // Changer d'état
    }, 3000);
    
  };

  const onAction = async (action: string) => {
    const currentNoteRecording = noteRecording;
    
    const newEntry = {
      uuid: controledRobot,
      action,
      captors: user.captors.state[controledRobot] || [],
      note: currentNoteRecording
    };
    setTrainer(trainer => [...trainer, newEntry]);
    //setTrainer([...trainer, { uuid: controledRobot, action, captors: user.captors.state[controledRobot] }]);
    await user.emitMotorEvent(controledRobot, action);

    setTimeout(async () => {
      await user.emitMotorEvent(controledRobot, 'STOP');
    }, 600);
    //const currentNote = note;

 
    //setTrainer([...trainer, { uuid: controledRobot, action, captors: user.captors.state[controledRobot], note: currentNote }]);
    //await user.emitMotorEvent(controledRobot, action);

  };

  const onExecute = async () => {
    if (mode === 'TRAIN') {
      const data = trainer.map(({ action, captors, note}) => ({
        input: [...captors, note && noteToNumberMapping[note] ? noteToNumberMapping[note] : 0], // Utilisez la note stockée pour chaque entrée
      output: action,
    }));
  
      console.log("Verifying input sizes:", data.map(d => d.input.length));
      const traindata = await user.trainModel(data, inputMode);
      setTrainingData(traindata);
      setMode('PREDICT');
    }
  };

  const stopExecutionAndReset = () => {
   
    setMode('TRAIN');
    if (controledRobot) {
      user.emitMotorEvent(controledRobot, 'STOP');
    }
  
  
  }

  const resetModelAndTrainer = async () => {
    // Réinitialisez le modèle
    
  
    // Réinitialisez le trainer
    setTrainer([]);
    stopExecutionAndReset();
  
    // Réinitialiser d'autres états si nécessaire
    // setRobots([]), setControledRobot(''), etc.
    handleSetCurrentState(STATES.ConsigneTraining);
    const updatedVisitedStates = {
      Title: true,
      // Mettez le deuxième état ici
      ConsigneTraining: false
  };
  setVisitedStates(updatedVisitedStates);
  };
  
  
  useEffect(() => {
    if (mode === 'PREDICT') {
        const interval = setInterval(() => {
            const data = user.captors.state[controledRobot].map(captor => captor.toString());
            if (typeof note === 'string') {
                const noteNumber = noteToNumberMapping[note] || 0; // Fallback to 0 if note is not found
                console.log("note: ", note);
                console.log("notemapped ", noteToNumberMapping[note])
                console.log("input data du modèle: ", data, " + ", noteNumber);
                user.predict(controledRobot, data, noteToNumberMapping[note], isWinnerTakesAll, inputMode)
                    .then(response => {
                        setPredictions(response.predictions);
                        setActivations(response.activations);
                        console.log('Activations Updated:', response.activations);
                    })
                    .catch(error => {
                        console.error('Error during prediction:', error);
                    });
            }
        }, 1000);

        return () => clearInterval(interval);
    }
}, [mode, controledRobot, note, user, isWinnerTakesAll, inputMode]);


const handleTransition = () => {
  if (noteRecording !== null && noteRecording !== 0) {
    handleSetCurrentState(STATES.MapAction);
  } else {
    alert(t('no_note'));
  }
};
  
const renderCurrentState = () => {
  switch (currentState) {
    case STATES.Title:
      return (
        <>
        {showConnectingPopup && (
          <div className="popup-overlay-title">
          <div className="popup-content-title">
            <p>{popupMessage}</p>
            <div className="spinner-container">
            <div style={{ display: 'flex' }}>
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="spinner-bar"></div>
              ))}
              </div>
            </div>
          </div>
        </div>
        )}
        <><h1 style={{ fontSize: '44px' }}>{t('ai_tools_title')}</h1>
        <div style={{ flex: 1, marginRight: '20px', fontSize:  '12pt'}}>
          <div className="instructions-container">
          <h4>{t('instructions_title')}</h4>
            <ol>
                <li>{t('instruction_step1')}</li>
                <li>{t('instruction_step2')}</li>
                <li>{t('instruction_step3')}</li>
                <li>{t('instruction_step4')}</li>
                <li>{t('instruction_step5')}</li>
            </ol>
          </div>
          <div className="card">
            <button onClick={onClickGetRobots} className="getRobots-button">{t('get_robots')}</button>

          </div>
          {robots.map((robot, index) => (
            <div key={index} className="card">
              <button onClick={() => onSelectRobot(robot)}>{robot}</button>
            </div>

          ))}
        </div></>
        </>
      );
    case STATES.ConsigneTraining:
      return (<> <div className="instructions-container">
      <h4>{t('instructions_title')}</h4>
      <ol>
      <li>{t('train_instruction_1')}</li>
      <li>{t('train_instruction_2')}</li>
      <li>{t('train_instruction_3')}</li>
      <li>{t('train_instruction_4')}</li>
      <li>{t('train_instruction_5')}</li>
      </ol>
    </div>
      <button className="use-captors-and-note-button" onClick={() => handleModeChange('CAPTORS_AND_NOTE')}>
        {t('use_captors_and_note')}
      </button>
      <button className="use-note-only-button" onClick={() => handleModeChange('NOTE_ONLY')}>
        {t('use_note_only')}
      </button></>)

case STATES.PlayNote:
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button className="start-recording-button" onClick={() => {
    startRecording();
    setShowPopup(true);
  }} disabled={isRecording} 
  style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'flex-start', 
    width: 'auto', 
    padding: '10px 20px',
    gap: '10px'  
  }}>
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* SVG path ici */}
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C13.1046 2 14 2.89543 14 4V11C14 12.1046 13.1046 13 12 13C10.8954 13 10 12.1046 10 11V4C10 2.89543 10.8954 2 12 2Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M18 11V4C18 1.79086 16.2091 0 14 0C11.7909 0 10 1.79086 10 4V11C10 13.2091 11.7909 15 14 15V18H10V20H18V18H14V15C16.2091 15 18 13.2091 18 11Z" fill="currentColor"/>
  </svg>
  {t('start_recording')}
</button>
        <Piano onNoteChange={setNoteRecording} silentMode={silentMode} className="piano" style={{ marginTop: '20px', width: '100%' }} />
      </div>
      <br />
      {audioUrl && (
        <button onClick={() => new Audio(audioUrl).play()}>{t('playback')}</button>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid white', padding: '20px' }}>
        {user.captors.state[controledRobot] && (
          <div  className="thymio-svg-component" style={{ width: '30%', margin: '0 10px' }}>
            <ThymioSVG captors={user.captors.state[controledRobot]} style={{ width: '100%', height: 'auto' }} />
          </div>
        )}
        <div className="musical-staff-component" style={{ width: '50%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
        {noteRecording !== 0 && (
          <div className='Note' style={{ margin: '0 auto' }}>
            <p>{t('note')} {noteRecording}</p>
          </div>
        )}
      </div>
          <MusicalStaff noteRecording={noteRecording} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button className="go-to-map-action-button" onClick={handleTransition}>{t('go_to_map_action')}</button>
      </div>
      {showPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }} className="popup-overlay">
          <div style={{ display: 'flex' }}>
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="wave-bar"></div>
            ))}
          </div>
          <p style={{ color: 'white', marginTop: '20px' }}>{t('Recording')}</p>
        </div>
      )}
    </>
  );
    
    
    
      case STATES.MapAction:
  // Objets pour gérer les sources d'images
  const gifSources = {
    STOP: stopGif,
    FORWARD: forwardGif,
    BACKWARD: backwardGif,
    LEFT: rightGif,
    RIGHT: leftGif
  };

  const staticSources = {
    STOP: stopStatic,
    FORWARD: forwardStatic,
    BACKWARD: backwardStatic,
    LEFT: rightStatic,
    RIGHT: leftStatic
  };

  const handleMouseEnter = (button, action) => {
    const img = button.getElementsByTagName('img')[0];
    img.src = gifSources[action];
  };

  const handleMouseLeave = (button, action) => {
    const img = button.getElementsByTagName('img')[0];
    img.src = staticSources[action];
  };

  const handleAction = (action) => {
    console.log(action + " action triggered");
    onAction(action);

  };

  return (
    <>
      <div className="actions-container" style={{ flex: 1, marginRight: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{t('choose_action')}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {Object.keys(gifSources).map(action => (
            <button
              key={action}
              onClick={() => handleAction(action)}
              onMouseEnter={(e) => handleMouseEnter(e.currentTarget, action)}
              onMouseLeave={(e) => handleMouseLeave(e.currentTarget, action)}
              style={{
                border: '2px solid #ccc',
                borderRadius: '5px',
                background: 'none',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={staticSources[action]}
                alt={action}
                style={{ width: '150px', height: '150px' }}
              />
              {t(action.toLowerCase())}
            </button>
          ))}
        </div>
        <br />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{ overflowX: 'auto', maxHeight: '300px' }} className="trainer-table-container"> {/* Ajustez maxHeight selon vos besoins */}
          <table className="trainer-table">
            <thead>
              <tr>
                <th>{t('Action')}</th>
                {inputMode !== 'NOTE_ONLY' && <th>{t('captors_values')}</th>}
                <th>{t('note_display')}</th>
              </tr>
            </thead>
            <tbody>
              {trainer.map(({ action, captors, note }, index) => (
                <tr key={index}>
                  <td>{t(`action_${action.toLowerCase()}`)}</td>
                  {inputMode !== 'NOTE_ONLY' && <td><ThymioSVG captors={captors} style={{ width: '100px', height: 'auto' }} /></td>}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <p style={{ margin: '0' }}>{note}</p>
                      <div style={{ transform: 'scale(0.7)', marginTop: '-20px'}}>
                        <MusicalStaff note={note}  />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', width: '100%' }}>
          <button onClick={() => handleSetCurrentState(STATES.PlayNote)} style={{ margin: '0 10px' }} className="map-more-actions-button">
            {t('map_more_actions')}
          </button>
          <button onClick={() => { console.log("Save model"); }} style={{ margin: '0 10px' }} className="save-model-button">
            {t('save_model')}
          </button>
          <button
            onClick={() => {
              if (trainer.length > 0) {
                handleSetCurrentState(STATES.ConsigneTesting);
              } else {
                alert(t('no_training_data'));
              }
            }} 
            style={{ margin: '0 10px' }} 
            className="test-model-button">
            {t('test_the_model')}
          </button>
        </div>
      </div>
    </>
  );
  
  
  



  

  

  case STATES.ConsigneTesting:
    return (
      <div className="container">
        {showInstructions && (
          <div className="instructions-container">
            <h4>{t('testing_instructions_title')}</h4>
            <ol>
              <li>{t('testing_instruction_step1')}</li>
              <li>{t('testing_instruction_step2')}</li>
            </ol>
            <button onClick={handleExecute} className="execute-btn">
              {t('execute')}
            </button>
          </div>
        )}
        
        {isTrainingComplete && (
          <div className="visualization-container">
            <NeuralNetworkVisualizationTraining trainingData={trainingData} inputMode={inputMode} />
          </div>
        )}
        
        {isTrainingComponentLoaded && (
          <button onClick={() => handleSetCurrentState(STATES.Testing)} style={{ marginTop: '20px' }}>{t('testing')}</button>
        )}
      </div>
    );


    case STATES.Testing:
      return (
        <div>
          {/* Première ligne : Contrôle d'enregistrement, affichages, ThymioSVG, et BarChart */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}> 
              <button onClick={toggleContinuousRecording} className="toggle-recording-btn">
                {isContinuousRecording ? t('stop_continuous_recording') : t('start_continuous_recording')}
              </button>
              {maxFreq !== null && (
                <div className='max-frequency-display'>
                  <p>{t('max_frequency')}: {maxFreq.toFixed(2)} Hz</p>
                </div>
              )}
              {note !== null  && (
                <div className='note-display' style={{ marginBottom: '40px' }}>
                  <p style={{ marginBottom: '20px' }}>{t('tone')}: {note}</p>
                  <MusicalStaff noteRecording={note} />
                </div>
              )}
            </div>
            {user.captors.state[controledRobot] && (
              <div style={{ flex: 1, transform: 'scale(0.6)' }}>
                <ThymioSVG captors={user.captors.state[controledRobot]} style={{ width: '100%', height: 'auto' }} className="thymio-svg" />
              </div>
            )}
            <div style={{ flex: 0.75, height: '350px', minHeight: '350px' }}className="bar-chart-container"> 
          <BarChart data={predictions} labels={labels} />
        </div>
          </div>
    
          {/* Deuxième ligne : Boutons Load, Execute et Visualize */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <button onClick={() => console.log('Load other model')} style={{ marginRight: '20px' }}className="load-model-btn">
            {t('load_other_model')}
            </button>
            <button onClick={onExecute} style={{ marginRight: '20px' , width :'300px', height : 'auto'}}className="execute-btn">
            {t('execute')}
            </button>
            <button onClick={() =>  handleSetCurrentState(STATES.CurrentModelTest)} className="visualize-nn-btn">
            {t('visualize_neural_network')}
            </button>
          </div>
    
          {/* Troisième ligne : Piano */}
          <Piano onNoteChange={setNote} silentMode={silentMode} className="piano" />

    
          {/* Quatrième ligne : Contrôle du test et réinitialisation */}
          <div style={{ marginTop: '20px' }}>
            <button onClick={stopExecutionAndReset} style={{ marginRight: '20px' }} className="stop-testing-btn">
            {t('stop_testing')}
            </button>
            <button onClick={() => setIsWinnerTakesAll(!isWinnerTakesAll)} style={{ marginRight: '20px' }} className="switch-decision-btn">
            {isWinnerTakesAll ? t('switch_to_probabilistic_decision') : t('switch_to_winner_takes_all')}
            </button>
            <button onClick={() => { resetModelAndTrainer();  handleSetCurrentState(STATES.ConsigneTraining);}} className="reset-training-btn">
            {t('reinitialize_the_model')}
            </button>
          </div>
        </div>
      );
    

    case STATES.CurrentModelTest:
      

    // Appeler loadModel lorsqu'on entre dans cet état
    if (!model && !loading) {
        loadModel();
    }
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', justifyContent: 'center' }}>
          {note !== null && (
            <div className='note-display' style={{ alignSelf: 'center' }}>
              <p>{t('tone')}: {note}</p>
              <MusicalStaff noteRecording={note} />
            </div>
          )}
    
          
          <svg
            height="50"
            width="200"
            style={{ position: 'absolute', left: '30%', top: '50%', transform: 'translate(-50%, -50%)' }}
            xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="25" x2="170" y2="25" stroke="blue" strokeWidth="5" markerEnd="url(#arrowhead)" />
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" stroke="blue" fill = "blue"/>
              </marker>
            </defs>
          </svg>
    
          {/* Conteneur pour NeuralNetworkVisualization pour permettre un meilleur contrôle du positionnement */}
          <div style={{ width: 'auto', marginLeft: '120px' }}>
            <NeuralNetworkVisualization model={model} inputMode={inputMode} activations={activations} outputactiv={predictions} />
          </div>
        </div>
        <button
          onClick={() => handleSetCurrentState(STATES.Testing)}
          style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          {t('return_to_testing')}
        </button>
        <Piano onNoteChange={setNote} silentMode={silentMode} className="piano" />
      </>
    );
      
    default:
      return null;
  }
};

return (
  <>
    <NavigationBar states={STATES_ARRAY} currentState={currentState} setCurrentState={setCurrentState} visitedStates={visitedStates} />
    <div className="App" style={{ marginTop: '40px' }}>
      {renderCurrentState()}
    </div>
    <button
      ref={settingsButtonRef}
      onClick={toggleSettings}
      className="OpenMenuButton"
      aria-label={t('toggle_settings')}
    >
      <img src={SettingsIcon} alt={showSettings ? t('close_settings') : t('open_settings')} />
    </button>
    <button
      className="TutorialButton"
      onClick={() => startTour()}
      aria-label={t('start_tour')}
    >
    </button>
    <Joyride
      run={run}
      steps={steps}
      continuous={true}
      showSkipButton={true}
      spotlightClicks={true}
      disableOverlayClose={true}
      showProgress={false}
      locale={locale}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#d41313',
          textColor: '#fff',
          backgroundColor: '#333',
          arrowColor: '#ab1120',
        },
        buttonNext: {
          color: '#fff',
          backgroundColor: '##aaa',
        },
        buttonBack: {
          color: '#fff',
          backgroundColor: '#aaa',
        },
        buttonSkip: {
          color: '#fff',
          backgroundColor: '#aaa',
        }
      }}
      callback={handleJoyrideCallback}
    />
    <aside ref={menuRef} className={`DrawerMenu ${showSettings ? 'open' : ''}`} role="menu">
      <nav className="Menu">
        <h2>{t('settings_panel')}</h2>
        <p>{t('current_input_mode')}: {inputMode === 'NOTE_ONLY' ? t('note_only') : t('captors_and_note')}</p>
        <div>
          <label htmlFor="recordDuration">
            {t('record_duration')} (s): <span>{recordDuration / 1000}</span>
          </label>
          <input
            id="recordDuration"
            type="range"
            min="1"
            max="10"
            step="1"
            value={recordDuration / 1000}
            onChange={(e) => setRecordDuration(Number(e.target.value) * 1000)}
          />
        </div>
        <div className="MenuLink">
          <label htmlFor="thresholdSlider">{t('threshold')}: {threshold}</label>
          <input
            id="thresholdSlider"
            type="range"
            min="180"
            max="250"
            step="1"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </div>
        <button onClick={toggleSilentMode} className="MenuLink">
          {silentMode ? t('disable_silent_mode') : t('enable_silent_mode')}
        </button>
        <button onClick={() => resetModelAndTrainer()} className="MenuLink">
          {t('reset_model')}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          <button onClick={() => i18n.changeLanguage('fr')} className="MenuLink" title="Français">
            <span className="fi fi-fr"></span>
          </button>
          <button onClick={() => i18n.changeLanguage('en')} className="MenuLink" title="English">
            <span className="fi fi-us"></span>
          </button>
        </div>
      </nav>
      <div className="MenuOverlay" onClick={() => setShowSettings(false)} />
    </aside>
  </>
);

});

export default App;
