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

  const [captorsForAction, setCaptorsForAction] = useState([]); //To store captors between playnote and mapAction

  const [actionClicked, setActionClicked] = useState(false); //Used to make blink in mapAction
  
  const [isExecuting, setIsExecuting] = useState(false);  // État pour contrôler l'affichage du popup pendant training


  

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


const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
          const text = e.target.result;
          const data = JSON.parse(text);
          setTrainer(data);
          console.log("Trainer data loaded from file.");
      };
      reader.onerror = (error) => {
          console.error('Error reading file:', error);
          alert('An error occurred reading the file.');
      };
      reader.readAsText(file);
  }
};

const captureSensorValues = () => {
  const currentCaptors = user.captors.state[controledRobot] || [];
  // Stockez les valeurs des capteurs dans l'état pour les utiliser plus tard
  setCaptorsForAction(currentCaptors); // Vous devez ajouter cette nouvelle variable d'état pour stocker les capteurs
  console.log("Captors captured for action:", currentCaptors);
};



const loadTrainerLocally = () => {
  const data = localStorage.getItem('trainerData');
  return data ? JSON.parse(data) : null;
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

  const saveTrainerToFile = () => {
    const trainerData = JSON.stringify(trainer); // Convertir les données du trainer en JSON
    const blob = new Blob([trainerData], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = "trainerData.json"; // Nom du fichier à sauvegarder
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
};




  
  
  const handleExecute = async () => {
    setIsExecuting(true);
    await onExecute();
    setShowInstructions(false);
    setIsExecuteClicked(true);
    setIsTrainingComplete(true);
    setIsExecuting(false)
  };

  useEffect(() => {
    if (isExecuteClicked) {
      setTimeout(() => {
        setIsTrainingComponentLoaded(true);
      }, 3000);  // Simuler un délai de chargement
    }
  }, [isExecuteClicked]);

  useEffect(() => {
    if (currentState === STATES.MapAction) {
      setActionClicked(false);
    }
  }, [currentState]);
  

  useEffect(() => {
    // Vérifiez si l'état actuel est PlayNote
    if (currentState === STATES.PlayNote) {
      setNoteRecording(0);
      console.log('Note recording reset to zero');
    }
  }, [currentState]); // Dépendance sur currentState pour réagir à ses changements
  

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
          },
          {
            target: '.robot-list',
            content: t('tooltip_select_robot'),
            placement: 'bottom',
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
        setTimeout(() => {
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
    }, 500);
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
      captors: captorsForAction,
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
                {inputMode !== 'NOTE_ONLY' && <li>{t('instruction_step6')}</li>}
                {inputMode !== 'NOTE_ONLY' && <li>{t('instruction_step3')}</li>}
                
                <li>{t('instruction_step4')}</li>
                <li>{t('instruction_step5')}</li>
            </ol>
          </div>
          <div className="card">
            <button onClick={onClickGetRobots} className="getRobots-button">{t('get_robots')}</button>

          </div>
          <div className="robot-list">
          {robots.map((robot, index) => (
            <div key={index} className="card">
              <button onClick={() => onSelectRobot(robot)} className="robot-button">{robot}</button>
            </div>

          ))}</div>
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
      <div className={`record-note-section ${noteRecording === 0 ? 'blinking-border' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <label>1) Record a note</label>
        <button className="start-recording-button" onClick={() => {
          startRecording();
          setShowPopup(true);
        }} disabled={isRecording}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 'auto', 
          padding: '10px 20px',
          gap: '10px'  
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C13.1046 2 14 2.89543 14 4V11C14 12.1046 13.1046 13 12 13C10.8954 13 10 12.1046 10 11V4C10 2.89543 10.8954 2 12 2Z" fill="currentColor"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M18 11V4C18 1.79086 16.2091 0 14 0C11.7909 0 10 1.79086 10 4V11C10 13.2091 11.7909 15 14 15V18H10V20H18V18H14V15C16.2091 15 18 13.2091 18 11Z" fill="currentColor"/>
          </svg>
          {t('start_recording')}
        </button>
        {audioUrl && (
          <button onClick={() => new Audio(audioUrl).play()}>{t('playback')}</button>
        )}
        <div className="piano-container">
          <Piano onNoteChange={setNoteRecording} silentMode={silentMode} className="piano" />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '20px' }}>
    <div className="note-recorded-section" style={{ flex: 1, maxHeight: '200px' }}>
        <label>2) Note recorded</label>
        <div className="note-recorded-display" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '30px' }}>
            <MusicalStaff noteRecording={noteRecording} />
            <p style={{ margin: '10px 0 0' }}>{t('note_recorded')}: {noteRecording ? noteRecording : 'None'}</p>
        </div>
    </div>
    {inputMode === 'CAPTORS_AND_NOTE' && (
        <div className={`thymio-svg-container ${noteRecording !== 0 && inputMode === 'CAPTORS_AND_NOTE' ? 'blinking-border' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '240px', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
            <label className="label-text" style={{ alignSelf: 'flex-start', margin: '10px 10px 0 10px', fontWeight: 'bold', textAlign: 'left', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '2px 5px' }}>3) Activez les senseurs voulus</label>
            <div className="thymio-svg-component" style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '10px', transform: 'scale(0.4)' }}>
                <ThymioSVG captors={user.captors.state[controledRobot]} />
            </div>
        </div>
    )}
</div>


      <div className="go-to-map-action-button-container" style={{ marginTop: '-10px' }}>
      <button className={`go-to-map-action-button ${noteRecording !== 0 ? 'blinking-border' : ''}`} onClick={() => {
        captureSensorValues();
        handleTransition();
      }}>
          {inputMode === 'CAPTORS_AND_NOTE' ? t('go_to_map_action_captors') : t('go_to_map_action')}
        </button>
      </div>

      {showPopup && (
        <div className="popup-overlay">
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
      setActionClicked(true);
      onAction(action);
    };
  
    return (
      <>
        <div className={`actions-container ${!actionClicked ? 'blinking-border' : ''}`} style={{ border: '2px solid #ccc', padding: '10px', marginBottom: '20px' }}>
          <h2 className="label-text">{t('choose_action')}</h2>
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
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 3, marginRight: '20px' }}>
            <div style={{ overflowX: 'auto', maxHeight: '250px' }} className="trainer-table-container">
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
                            <MusicalStaff note={note} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className={`map-more-actions-container ${actionClicked ? 'blinking-border' : ''}`} style={{ paddingTop: '0px', border: '2px solid white', marginTop: '0px' }}>
            <label className="label-text" style={{ position: 'relative', top: '0px', left: '-10px' }}>2)</label>
              <button onClick={() => handleSetCurrentState(STATES.PlayNote)} className="map-more-actions-button" style={{ marginBottom: '10px' }}>
                {t('map_more_actions')}
              </button>
              <div style={{ paddingTop: '0px', border: 'none', marginBottom: '10px' }}>
              <label className="label-text" style={{ position: 'relative', top: '0px', left: '-10px' }}>{t('or')}</label>
              </div>
              <button onClick={() => {
                if (trainer.length > 0) {
                  handleSetCurrentState(STATES.ConsigneTesting);
                } else {
                  alert(t('no_training_data'));
                }
              }} className="test-model-button">
                {t('test_the_model')}
              </button>
            </div>
            <div style={{ padding: '10px', border: '2px solid white' }}>
              <button onClick={saveTrainerToFile} className="save-model-button" style={{ marginBottom: '10px' }}>
                {t('save_model')}
              </button>
              <button onClick={() => document.getElementById('fileInput').click()} className="load-model-button">
                {t('load_other_model')}
              </button>
              <input
                type="file"
                id="fileInput"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept=".json"
              />
            </div>
          </div>
        </div>
      </>
    );
    
  
  
  
  



  

  

    case STATES.ConsigneTesting:
      return (
        <div className="container">
            {isExecuting && (
              <div className="popup-overlay">
                <div className="popup-content">
                  <p>{t('processing')}</p>
                  <div className="spinner-container">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div key={index} className="spinner-bar"></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
            <div className="visualization-container" style={{ border: '2px solid white', padding: '10px', margin: '20px 0', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <label className="label-text" style={{ position: 'absolute', top: '10px', left: '10px' }}>{t('Neuralnet_training')}</label>
              <NeuralNetworkVisualizationTraining trainingData={trainingData} inputMode={inputMode} />
            </div>
          )}

          
          {isTrainingComponentLoaded && (
            <div style={{ border: '2px solid white', padding: '10px', marginTop: '5px' }}>
              <div>
              <label className="label-text" style={{ position: 'relative', top: '0px', left: '0px' }}>{t('Model_ready')}</label>
              </div>
              <button onClick={() => handleSetCurrentState(STATES.Testing)}>{t('testing')}</button>
            </div>
          )}
        </div>
      );
    

    case STATES.Testing:
      return (
        <div>
          {/* First line: Live recording with the Piano and control buttons */}
          <div style={{
            display: 'flex',
            marginBottom: '20px',
            alignItems: 'stretch'
          }}>
            <div style={{
              border: '1px solid white',
              padding: '10px',
              minWidth: '600px', // Fixed width for the piano
              marginRight: '20px',
              display: 'flex',
              flexDirection: 'column' // Changes layout to vertical for label, button and piano
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px' }}>
                <label style={{ textAlign: 'left', width: '100%' }}><span className="label-text">1) Live recording</span></label>
                <button onClick={toggleContinuousRecording} className="toggle-recording-btn" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', marginBottom: '2px' }}>
                  {isContinuousRecording ? t('stop_continuous_recording') : t('start_continuous_recording')}
                </button>
              </div>
              <Piano onNoteChange={setNote} silentMode={silentMode} className="piano" />
            </div>
    
            {/* Control buttons stacked vertically */}
            <div style={{
              border: '1px solid white',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <button onClick={stopExecutionAndReset} className="stop-testing-btn">
                {t('stop_testing')}
              </button>
              <button onClick={() => handleSetCurrentState(STATES.CurrentModelTest)} className="visualize-nn-btn">
                {t('visualize_neural_network')}
              </button>
              <button onClick={() => setIsWinnerTakesAll(!isWinnerTakesAll)} className="switch-decision-btn">
                {isWinnerTakesAll ? t('switch_to_probabilistic_decision') : t('switch_to_winner_takes_all')}
              </button>
              <button onClick={() => { resetModelAndTrainer(); handleSetCurrentState(STATES.ConsigneTraining); }} className="reset-training-btn">
                {t('reinitialize_the_model')}
              </button>
            </div>
          </div>
    
          {/* Second line: Input received and Action selected */}
          <div style={{
            display: 'flex',
            marginBottom: '20px'
          }}>
            {/* Part 2: Input received with ThymioSVG and MusicalStaff */}
            <div style={{
              border: '1px solid white',
              padding: '10px',
              marginRight: '20px',
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <label style={{ textAlign: 'left' }}><span className="label-text">2) Input received</span></label>
              <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
                {inputMode === 'CAPTORS_AND_NOTE' && (
                  <ThymioSVG captors={user.captors.state[controledRobot]} style={{ width: '150px', height: 'auto', marginRight: '20px' }} />
                )}
                <MusicalStaff noteRecording={note} style={{ flex: 1 }} />
              </div>
            </div>
    
            {/* Part 3: Action selected with BarChart */}
            <div style={{
              border: '1px solid white',
              padding: '10px',
              flexGrow: 2,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <label style={{ textAlign: 'left' }}><span className="label-text">3) Action selected</span></label>
              <div className="bar-chart-container" style={{ flex: 1 }}>
                <BarChart data={predictions} labels={labels} />
              </div>
            </div>
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
