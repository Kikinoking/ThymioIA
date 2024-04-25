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
import NeuralNetworkVisualization from '../../Entities/ThymioManager/Model/NeuralNetworkVisualization';
import Joyride, { CallBackProps, STATUS } from 'react-joyride';




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

  const menuRef = useRef(null); // Référence pour le menu

  const [isTutorialActive, setIsTutorialActive] = useState(false); //For Tutorial

  const { t, i18n } = useTranslation();

  const toggleTutorial = () => {
    setIsTutorialActive(!isTutorialActive);
  };

//For bar chart$

  const [predictions, setPredictions] = React.useState([0.2, 0.3, 0.1, 0.15, 0.25]); 
  const labels = [ t('action_stop'),
  t('action_forward'),
  t('action_backward'),
  t('action_left'),
  t('action_right')]; 

  const [activeTab, setActiveTab] = useState('Training');
  
  const [currentState, setCurrentState] = useState('Title');

  const [run, setRun] = useState(false);//Used for tutorial
  const [steps, setSteps] = useState<Step[]>([]);

  const [model, setModel] = useState<tf.Sequential | null>(null);
  const [loading, setLoading] = useState(false);

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
    CurrentModelTrain: 'CurrentModelTrain',
    ConsigneTesting: 'ConsigneTesting',
    Testing: 'Testing',
    CurrentModelTest: 'CurrentModelTest'
  };

  const locale = {
    back: t('joyride.back'),
    close: t('joyride.close'),
    last: t('joyride.last'),
    next: t('joyride.next'),
    skip: t('joyride.skip')
  };

  const nextState = () => {
    switch (currentState) {
      case STATES.Title:
        setCurrentState(STATES.ConsigneTraining);
        break;
      case STATES.ConsigneTraining:
        setCurrentState(STATES.PlayNote);
        break;
      case STATES.PlayNote:
        setCurrentState(STATES.MapAction);
        break;
      case STATES.MapAction:
        setCurrentState(STATES.CurrentModelTrain);
        break;
      case STATES.CurrentModelTrain:
        setCurrentState(STATES.ConsigneTesting);
        break;
      case STATES.ConsigneTesting:
        setCurrentState(STATES.Testing);
        break;
      case STATES.Testing:
        setCurrentState(STATES.CurrentModelTest);
        break;
      case STATES.CurrentModelTest:
        setCurrentState(STATES.Title); // Loop back to the start or decide to end.
        break;
      default:
        setCurrentState(STATES.Title);
    }
  };
  


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
    setCurrentState(STATES.PlayNote);
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

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);

  setIsRecording(true);
  let audioChunks = [];
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.start();

  mediaRecorder.onstop = async () => {
    setIsRecording(false);
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
};

  const onClickGetRobots = async () => {
    const _robots = await user.getRobotsUuids();
    setRobots(_robots);
  };

  const onSelectRobot = async (robotUuid: string) => {
    user.takeControl(robotUuid);
    setControledRobot(robotUuid);
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
      await user.trainModel(data, inputMode);;
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
    setCurrentState(STATES.ConsigneTraining);
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
                    .then(predictions => {
                        setPredictions(predictions);
                    })
                    .catch(error => {
                        console.error('Error during prediction:', error);
                    });
            }
        }, 1000);

        return () => clearInterval(interval);
    }
}, [mode, controledRobot, note, user, isWinnerTakesAll, inputMode]);
useEffect(() => {
  if (controledRobot) {
    nextState();
  }
}, [controledRobot]);

const handleTransition = () => {
  if (noteRecording !== null && noteRecording !== 0) {
    setCurrentState(STATES.MapAction);
  } else {
    alert("No valid note recorded!");
  }
};
  
const renderCurrentState = () => {
  switch (currentState) {
    case STATES.Title:
      return (
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
            <button className="start-recording-button" onClick={startRecording} disabled={isRecording}>
            {t('start_recording')}
            </button>
            <Piano className="piano" onNoteChange={setNoteRecording} style={{ marginTop: '20px', width: '100%' }} />
          </div>
          <br />
          {audioUrl && (
            <button onClick={() => new Audio(audioUrl).play()}>{t('playback')}</button>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid white', padding: '20px' }}>
            {user.captors.state[controledRobot] && (
              <div  className="thymio-svg-component" style={{ width: '30%', margin: '0 10px' }}>
                <ThymioSVG captors={user.captors.state[controledRobot]} style={{ width: '7%', height: 'auto' }} />
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
        </>
      );
    
    
    
      case STATES.MapAction:
  const handleAction = (action) => {
    console.log(action + " action triggered"); // Affiche l'action déclenchée
    onAction(action); // Exécute l'action spécifique
    setCurrentState(STATES.CurrentModelTrain); // Change l'état après l'exécution de l'action
  };

  return (
    <div className="actions-container" style={{ flex: 1, marginRight: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{t('choose_action')}</h2> 
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <button onClick={() => handleAction('STOP')}>
          <img src={stopGif} alt="Stop" style={{ display: 'block', margin: 'auto' ,width: '150px', height: '150px'}}/>
          {t('stop')}
        </button>
        <button onClick={() => handleAction('FORWARD')}>
          <img src={forwardGif} alt="Forward" style={{ display: 'block', margin: 'auto', width: '150px', height: '150px' }}/>
          {t('forward')}
        </button>
        <button onClick={() => handleAction('BACKWARD')}>
          <img src={backwardGif} alt="Backward" style={{ display: 'block', margin: 'auto', width: '150px', height: '150px'}}/>
          {t('backward')}
        </button>
        <button onClick={() => handleAction('LEFT')}>
          <img src={leftGif} alt="Left" style={{ display: 'block', margin: 'auto', width: '150px', height: '150px' }}/>
          {t('left')}
        </button>
        <button onClick={() => handleAction('RIGHT')}>
          <img src={rightGif} alt="Right" style={{ display: 'block', margin: 'auto', width: '150px', height: '150px'}}/>
          {t('right')}
        </button>
      </div>
      <br />
    </div>
  );


  case STATES.CurrentModelTrain:
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
        <div style={{ flex: 1 }} className="thymio-container">
          <div style={{ width: '30%', margin: '0 10px' }}>
            <ThymioSVG captors={user.captors.state[controledRobot]} style={{ width: '100%', height: 'auto' }} />
          </div>
        </div>
        <div style={{ flex: 2, overflowX: 'auto' }} className="trainer-table-container">
          <table className="trainer-table">
            <thead>
              <tr>
                <th>{t('Action')}</th>
                <th>{t('captors_values')}</th>
                <th>{t('note_display')}</th>
              </tr>
            </thead>
            <tbody>
              {trainer.map(({ action, captors, note }, index) => (
                <tr key={index}>
                  <td>{t(`action_${action.toLowerCase()}`)}</td>
                  <td>{captors.join(', ')}</td>
                  <td>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', width: '100%' }}>
        <button onClick={() => setCurrentState(STATES.PlayNote)} style={{ margin: '0 10px' }} className="map-more-actions-button">
        {t('map_more_actions')}
        </button>
        <button onClick={() => { console.log("Save model"); }} style={{ margin: '0 10px' }} className="save-model-button">
        {t('save_model')}
        </button>
        <button onClick={() => setCurrentState(STATES.ConsigneTesting)} style={{ margin: '0 10px' }} className="test-model-button">
        {t('test_the_model')}
        </button>
      </div>
    </div>
  );

  

  case STATES.ConsigneTesting:
  return (
    <div 
      style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
      onClick={() => setCurrentState(STATES.Testing)}
    >
      <div className="instructions-container">
        <h4>{t('testing_instructions_title')}</h4>
        <ol>
          <li>{t('testing_instruction_step1')}</li>
          <li>{t('testing_instruction_step2')}</li>
        </ol>
      </div>
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
                <ThymioSVG captors={user.captors.state[controledRobot]} className="thymio-svg" />
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
            <button onClick={() => setCurrentState(STATES.CurrentModelTest)} className="visualize-nn-btn">
            {t('visualize_neural_network')}
            </button>
          </div>
    
          {/* Troisième ligne : Piano */}
          <Piano onNoteChange={setNote} className="piano" />
    
          {/* Quatrième ligne : Contrôle du test et réinitialisation */}
          <div style={{ marginTop: '20px' }}>
            <button onClick={stopExecutionAndReset} style={{ marginRight: '20px' }} className="stop-testing-btn">
            {t('stop_testing')}
            </button>
            <button onClick={() => setIsWinnerTakesAll(!isWinnerTakesAll)} style={{ marginRight: '20px' }} className="switch-decision-btn">
            {isWinnerTakesAll ? t('switch_to_probabilistic_decision') : t('switch_to_winner_takes_all')}
            </button>
            <button onClick={() => { resetModelAndTrainer(); setCurrentState(STATES.ConsigneTraining);}} className="reset-training-btn">
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
        <div>
          <h2>Testing Model...</h2>
          {model ? (
            <NeuralNetworkVisualization model={model} />
          ) : (
            <p>Loading model...</p>
          )}
        </div>
      );
      
    default:
      return null;
  }
};

return (
  <>
    <div className="App">
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
      style={{ position: 'fixed', top: 10, right: 60, background: 'none',
      border: 'none',cursor: 'pointer',
      padding: 0, }} 
      aria-label={t('start_tour')}
    >
      <img src={HelpIcon} alt={t('start_tour')} />
    </button>
    <Joyride
        run={run}
        steps={steps}
        continuous={true}
        showSkipButton={true}
        spotlightClicks={true}
        disableOverlayClose ={true}
        showProgress={false}
        locale={locale}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#d41313', // change la couleur principale
            textColor: '#fff', // change la couleur du texte
            backgroundColor: '#333', // change la couleur de fond des tooltips
            arrowColor: '#ab1120', // change la couleur des flèches
          },
          buttonNext: {
            color: '#fff',
            backgroundColor: '##aaa', // couleur du bouton suivant
          },
          buttonBack: {
            color: '#fff',
            backgroundColor: '#aaa', // couleur du bouton précédent
          },
          buttonSkip:{
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
