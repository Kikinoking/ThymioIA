/**
 * App.tsx
 * 
 * This TypeScript file defines the main React component for the Thymio-based neural network training interface.
 * Contains a lot of elements, its the core of the app
 * Uses dynamic elements (thymioSVG, Chart.js,...)
 * Translation using i18n
 * Tour using Joyride
 * Help Icon from (bytedance): https://www.svgrepo.com/svg/387779/help
 * ThymioSVG extracted and reworked from Mobile robotics course, EPFL, F.Mondada : 
 * https://moodle.epfl.ch/pluginfile.php/2706097/mod_resource/content/1/ThymioCheatSheet.pdf
 * Setting Icon from (Mary Akveo): https://www.svgrepo.com/svg/469755/settings 
 * Loading animations from ldrs: https://uiball.com/ldrs/
 * Flag Icons : Provided by "flag-icon-css" :(https://github.com/lipis/flag-icon-css).
 */


import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import './App.css';
import { thymioManagerFactory } from '../../Entities/ThymioManager';
import { observer } from 'mobx-react';
import { noteToNumberMapping } from '../../noteMapping';
import * as React from 'react';

import { useTranslation } from 'react-i18next';   
import '../../i18n';
import BarChart from './BarChart';
import ThymioSVG from './ThymioSVG';
import Piano from './Piano';
import MusicalStaff from './MusicalStaff'; 
import './Menu.css';
import SettingsIcon from '../../assets/settings.svg';
import * as tf from '@tensorflow/tfjs'; //for visualisation
//Loading all the assets
import stopGif from '../../assets/actionsicons/Stopgif.gif';
import forwardGif from '../../assets/actionsicons/animForwardV2.gif';
import backwardGif from '../../assets/actionsicons/animBackward.gif';
import leftGif from '../../assets/actionsicons/AnimLeft.gif';
import rightGif from '../../assets/actionsicons/AnimRight.gif';
import stopStatic from '../../assets/actionsicons/STOPStatic.png';
import forwardStatic from '../../assets/actionsicons/ForwardStatic.png';
import backwardStatic from '../../assets/actionsicons/BackStatic.png';
import leftStatic from '../../assets/actionsicons/LeftStatic.png';
import rightStatic from '../../assets/actionsicons/RightStatic.png';
import NeuralNetworkVisualization from '../../Entities/ThymioManager/Model/NeuralNetworkVisualization';
import NeuralNetworkVisualizationTraining from '../../Entities/ThymioManager/Model/NeuralNetVisuTraining';
import NavigationBar from './NavigationBar';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

//Custom animations from ldrs for loading
import { momentum } from 'ldrs'

momentum.register()


import { grid } from 'ldrs'

grid.register()



Chart.register(...registerables);



//Map tones to a given number so that data is in a good format for NN
const user = thymioManagerFactory({ user: 'AllUser', activity: 'ThymioIA', hosts: ['localhost'] });


function frequencyToNoteNumber(frequency) { // to convert note to number index for keras
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);
  if (frequency === 0) return null; // Handle case null
  let h = Math.round(12 * Math.log2(frequency / C0));
  let octave = Math.floor(h / 12);
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  let n = h % 12;
  let note = noteNames[n] + octave; 
  return note;
}

const App = observer(() => {
  type InputMode = "CAPTORS_AND_NOTE" | "NOTE_ONLY";


  const { t, i18n } = useTranslation(); //i18n init.

  const [note, setNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [maxFreq, setMaxFreq] = useState(null); //To find max frequency
  const [isContinuousRecording, setIsContinuousRecording] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const analyserRef = useRef(null); //Need ref for audio analyser
  const audioContextRef = useRef(null); 

  const [maxDetectedFreq, setMaxDetectedFreq] = useState(null); //USed when recording not continuous
  const [noteRecording, setNoteRecording] = useState(''); //State storing recorded note

  const [threshold, setThreshold] = useState(200);  //sound threshold detection

  const [recordDuration, setRecordDuration] = useState(3000); //Record duration

  const [robots, setRobots] = useState<string[]>([]);
  const [controledRobot, setControledRobot] = useState<string>('');
  const [trainer, setTrainer] = useState<{ uuid: string; action: string; captors: number[]; note?: string }[]>([]);
  const [mode, setMode] = useState<'TRAIN' | 'PREDICT'>('TRAIN');

  const [isWinnerTakesAll, setIsWinnerTakesAll] = useState(true); //Toggle winner-take-all/probabilistic decision

  const [inputMode, setInputMode] = useState<InputMode>("CAPTORS_AND_NOTE"); // 'CAPTORS_AND_NOTE' or 'NOTE_ONLY'

  const [silentMode, setSilentMode] = useState(false); //Toggle visual piano sounds
  const [showSettings, setShowSettings] = useState(false);

  const settingsButtonRef = useRef(null); // Ref for settings button

  const [showPopup, setShowPopup] = useState(false); 

  const menuRef = useRef(null); // Ref for Menu

  const [trainingData, setTrainingData] = useState([]); //For visualisation of the training

  const [activations, setActivations] = useState([]); // For testing visualisation

  const [showConnectingPopup, setShowConnectingPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState(''); // Delay when connecting using dongle.

  const [captorsForAction, setCaptorsForAction] = useState([]); //To store captors between playnote and mapAction

  const [actionClicked, setActionClicked] = useState(false); //Used to make blink in mapAction

  const [isExecuting, setIsExecuting] = useState(false); // État pour contrôler l'affichage du popup pendant training

  const [filename, setFilename] = useState('');

  const [sensorData, setSensorData] = useState([]); //For neural net testing visualisation of the input

  const [rectCoords, setRectCoords] = useState([]);   //To draw arrows
  const [neuronCoords, setNeuronCoords] = useState([]); //idem

  const [isMusicalStaffMounted, setIsMusicalStaffMounted] = useState(false);   
  const svgRef = useRef(null);

  const [thymioSVGLoaded, setThymioSVGLoaded] = useState(false);

  const [theme, setTheme] = useState('light'); // 'light' is default theme

  const [showBiases, setShowBiases] = useState(false); // Default : biases not shown

  const [showDecisionButton, setShowDecisionButton] = useState(false); // Default: button hidden

  //For bar chart

  const [predictions, setPredictions] = React.useState([0.2, 0.3, 0.1, 0.15, 0.25]);

  const labels = [t('action_stop'), t('action_forward'), t('action_backward'), t('action_right'), t('action_left')];


  const [currentState, setCurrentState] = useState('Title'); //Default state = title

  const [run, setRun] = useState(false); //Used for tutorial
  const [steps, setSteps] = useState<Step[]>([]);

  const [model, setModel] = useState<tf.Sequential | null>(null); //Model
  const [loading, setLoading] = useState(false);

  const [adjustedRectCoords, setAdjustedRectCoords] = useState([]);
  const [adjustedNeuronCoords, setAdjustedNeuronCoords] = useState([]); //need neuroncoords for arrows in currentmodeltest
  const musicalStaffRef = useRef(null);
  const [musicalStaffCoords, setMusicalStaffCoords] = useState({ x: 0, y: 0 });

  const [visitedStates, setVisitedStates] = useState({ Title: true });
  const [isExecuteClicked, setIsExecuteClicked] = useState(false);
  const [isTrainingComponentLoaded, setIsTrainingComponentLoaded] = useState(false);

  const [showInstructions, setShowInstructions] = useState(true); //To show/hide instruction to make room for visualisation training
  const [isTrainingComplete, setIsTrainingComplete] = useState(false); //Wait end of training before visualisation of NN

  const [isModeSelected, setIsModeSelected] = useState(false);


  const recordDurationRef = useRef(null);
  const thresholdSliderRef = useRef(null);  //need ref for slider animation coloring

  const handleRectCoordinates = coords => {
   
    setRectCoords(coords);
  };

 

  const handleNeuronCoordinates = coords => {
   
    setNeuronCoords(coords);
  };

  



  const handleSetCurrentState = newState => { //Handle state change
   
    setCurrentState(newState);
    setVisitedStates(prev => {
      const updatedVisitedStates = { ...prev, [newState]: true };

      return updatedVisitedStates;
    });
  };
 
  // Function to load model
  const loadModel = async () => {
    if (!loading && !model) {
      setLoading(true);
      const loadedModel = await user.getModel();
      setModel(loadedModel);
      setLoading(false);

    }
  };

  //To upload file and load it 
  const handleFileUpload = event => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            const text = e.target.result;
            if (typeof text === 'string') { //Load file only if its a string
                const data = JSON.parse(text);
                setTrainer(data);
                console.log('Trainer data loaded from file.');
                if (model && model != null) {
                  
      
                  setModel(null); // Reset to null model state
                }
                //Reset everything
                setIsTrainingComplete(false);
                setIsTrainingComponentLoaded(false);
                setIsExecuteClicked(false);
                setShowInstructions(true);
            } else {
                console.error('Expected a string from FileReader but received a different type.');
            }
        };
        reader.onerror = error => {
            console.error('Error reading file:', error);
            alert(t('error_load'));
        };
        reader.readAsText(file); 
    }
};


  const captureSensorValues = () => {
    const currentCaptors = user.captors.state[controledRobot] || [];
    // Store sensor values
    setCaptorsForAction(currentCaptors);
  };

 
  //List of states
  const STATES = {
    Title: 'Title',
    ConsigneTraining: 'ConsigneTraining',
    PlayNote: 'PlayNote',
    MapAction: 'MapAction',
    ConsigneTesting: 'ConsigneTesting',
    Testing: 'Testing',
    CurrentModelTest: 'CurrentModelTest',
  };

  //Locale for joyride, apply i18n translation to tour
  const locale = {
    back: t('joyride.back'),
    close: t('joyride.close'),
    last: t('joyride.last'),
    next: t('joyride.next'),
    skip: t('joyride.skip'),
  };

  const saveTrainerToFile = filename => { //Save as JSON
    const trainerData = JSON.stringify(trainer);
    const blob = new Blob([trainerData], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename ? `${filename}.json` : 'ModelData.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  //When training is launched by clicking the execute button
  const handleExecute = async () => {
    setIsExecuting(true);
    await onExecute();
    setShowInstructions(false);
    setIsExecuteClicked(true);
    setIsTrainingComplete(true);
    setIsExecuting(false);
  };

  //Slider coloring animation
  useEffect(() => {
    const sliders = [recordDurationRef.current, thresholdSliderRef.current];
    sliders.forEach(slider => {
      if (slider) {
        const updateSliderBackground = () => {
          const min = slider.min || 0;
          const max = slider.max || 100;
          const value = slider.value;
          const percentage = ((value - min) / (max - min)) * 100;
          slider.style.background = `linear-gradient(to right, #027676 ${percentage}%, #76ABAE ${percentage}%)`; //slider gradient
        };

        updateSliderBackground();

        slider.addEventListener('input', updateSliderBackground);

        return () => {
          slider.removeEventListener('input', updateSliderBackground);
        };
      }
    });
  }, []);

  //Loading time, its intentionnal
  useEffect(() => {
    if (isExecuteClicked) {
      setTimeout(() => {
        setIsTrainingComponentLoaded(true);
      }, 3000); // loading time : 3s
    }
  }, [isExecuteClicked]);

  useEffect(() => {
    document.body.className = theme + '-theme'; // Applies 'light-theme' or 'dark-theme'
  }, [theme]);

  useEffect(() => { //Save theme locally
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => { //Use locally saved theme
    localStorage.setItem('theme', theme); 
  }, [theme]);

  useEffect(() => { //used for blinking border
    if (currentState === STATES.MapAction) {
      setActionClicked(false);
    }
  }, [currentState]);

  useEffect(() => {
    // Reset noterecording
    if (currentState === STATES.PlayNote) {
      setNoteRecording('');
    }
  }, [currentState]); // Depends on currentState

  // Ajusts coordinates of arrows depending on svg pos
  useEffect(() => {
    if (rectCoords.length > 0 && neuronCoords.length > 0 && svgRef.current) {
      setTimeout(() => {
        const svgBox = svgRef.current.getBoundingClientRect();

        const adjustedRectCoords = rectCoords.map(coord => ({
          x: coord.x - svgBox.left,
          y: coord.y - svgBox.top,
        }));

        const adjustedNeuronCoords = neuronCoords.map(coord => ({
          x: coord.x - svgBox.left,
          y: coord.y - svgBox.top,
        }));

        setAdjustedRectCoords(adjustedRectCoords);
        setAdjustedNeuronCoords(adjustedNeuronCoords);
      }, 100); // Delay : 100 ms
    }
  }, [rectCoords, neuronCoords, svgRef.current, mode]);

  // Initial coords for musicalstaff
  useEffect(() => {
    if (musicalStaffRef.current) {
      setTimeout(() => {
        const rect = musicalStaffRef.current.getBoundingClientRect();
        setMusicalStaffCoords({
          x: rect.right,
          y: rect.top + rect.height / 2,
        });
      }, 100); // Delay : 100 ms
    }
  }, [musicalStaffRef.current, mode, thymioSVGLoaded]);

  // Handles resizing
  useEffect(() => {
    const handleResize = () => {
      if (musicalStaffRef.current) {
        const rect = musicalStaffRef.current.getBoundingClientRect();
        setMusicalStaffCoords({
          x: rect.right,
          y: rect.top + rect.height / 2,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial_call to handle init coords

    return () => window.removeEventListener('resize', handleResize);
  }, [isMusicalStaffMounted, musicalStaffRef.current, mode]);

  useEffect(() => {
    const targetNode = musicalStaffRef.current;
    if (!targetNode) return;

    //Need mutation observer to handle resize,... still wonky but good enough
    const observer = new MutationObserver(mutationsList => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          setTimeout(() => {
            const rect = targetNode.getBoundingClientRect();
            setMusicalStaffCoords({
              x: rect.right,
              y: rect.top + rect.height / 2,
            });
          }, 100); // Delay: 100 ms
        }
      }
    });

    observer.observe(targetNode, { attributes: true, childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isMusicalStaffMounted, thymioSVGLoaded]);

  // Verifies that everything is loaded
  useEffect(() => {
    if (isMusicalStaffMounted && musicalStaffRef.current && thymioSVGLoaded) {
      setTimeout(() => {
        const rect = musicalStaffRef.current.getBoundingClientRect();
        setMusicalStaffCoords({
          x: rect.right,
          y: rect.top + rect.height / 2,
        });
      }, 100); // Delay: 100 ms
    }
  }, [thymioSVGLoaded]);

  

  const handleJoyrideCallback = data => { //Callback joyride to handle state change
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };
  const startTour = () => { //Function to Start joyride tour
    requestAnimationFrame(() => {
      setRun(true);
    });
  };

  useEffect(() => { //Joyride steps for each state
    switch (currentState) {
      case 'Title':
        if (robots.length > 0) {
          setSteps([
            {
              target: '.getRobots-button',
              content: t('tooltip_get_robots'),
              placement: 'left',
              disableBeacon: true,
            },

            {
              target: '.robot-list',
              content: t('tooltip_select_robot'),
              placement: 'bottom',
              disableBeacon: true,
            },
          ]);
        } else {
          setSteps([
            {
              target: '.getRobots-button',
              content: t('tooltip_get_robots'),
              placement: 'left',
              disableBeacon: true,
            },
          ]);
        }
        break;
      case 'ConsigneTraining':
        setSteps([
          {
            target: '.use-captors-and-note-button', 
            content: t('tooltip_use_captors_and_note'),
            placement: 'left',
            disableBeacon: true,
          },
          {
            target: '.use-note-only-button',
            content: t('tooltip_use_note_only'),
            placement: 'right',
          },
        ]);
        break;
      case 'PlayNote':
        setTimeout(() => {
          setSteps([
            {
              target: '.start-recording-button',
              content: t('tooltip_start_recording'),
              placement: 'top',
              disableBeacon: true,
            },
            {
              target: '.piano',
              content: t('piano-component-train'),
              placement: 'left',
            },
            {
              target: '.thymio-svg-component',
              content: t('tooltip_thymio_svg'),
              placement: 'left',
            },
            {
              target: '.note-recorded-display',
              content: t('tooltip_musical_staff'),
              placement: 'right',
            },
            {
              target: '.go-to-map-action-button',
              content: t('tooltip_go_to_map_action'),
              placement: 'bottom',
            },
          ]);
        }, 500);
        break;
      case 'MapAction':
        setSteps([
          {
            target: '.actions-container', 
            content: t('tooltip_map_actions'),
            placement: 'top',
            disableBeacon: true,
            styles: {
              options: {
                zIndex: 10000,
              },
            },
          },
          {
            target: '.trainer-table-container', 
            content: t('tooltip_trainer_table'),
            placement: 'left',
            styles: {
              options: {
                zIndex: 10000,
              },
            },
          },
          {
            target: '.map-more-actions-button', 
            content: t('tooltip_map_more_actions'),
            placement: 'right',
            styles: {
              options: {
                zIndex: 10000,
              },
            },
          },
          {
            target: '.test-model-button', 
            content: t('tooltip_test_model'),
            placement: 'right',
            styles: {
              options: {
                zIndex: 10000,
              },
            },
          },
          {
            target: '.button-container', 
            content: t('tooltip_button_container'),
            placement: 'bottom',
            styles: {
              options: {
                zIndex: 10000,
              },
            },
          },
        ]);
        break;
      case 'ConsigneTesting':
        if (isTrainingComplete) {
          setSteps([
            {
              target: '.visualization-container',
              content: t('tooltip_neural_network_visualization_train'),
              placement: 'left',
              disableBeacon: true,
            },
          ]);
        }
        break;
      case 'Testing':
        setSteps([
          {
            target: '.execute-btn',
            content: t('tooltip_execute'),
            placement: 'top',
            disableBeacon: true,
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
            target: '.input_components',
            content: t('tooltip_input_components'),
            placement: 'top',
          },
          {
            target: '.barchart-container',
            content: t('tooltip_bar_chart'),
            placement: 'bottom',
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
          },
        ]);
        break;
      case 'CurrentModelTest':
        if (isTrainingComplete) {
          setSteps([
            {
              target: '.toggle-recording-btn',
              content: t('tooltip_toggle_recording_musical_staff'),
              placement: 'top',
              disableBeacon: true,
            },
            {
              target: '.neural-network-container',
              content: t('tooltip_neural_network_visualization'),
              placement: 'right',
              styles: {
                options: {
                  zIndex: 10000,
                },
              },
            },
            {
              target: '.piano',
              content: t('tooltip_piano'),
              placement: 'left',
              disableBeacon: true,
            },
            {
              target: '.control-buttons-container',
              content: t('tooltip_control_buttons'),
              placement: 'left',
              styles: {
                options: {
                  zIndex: 10000,
                },
              },
            },
          ]);
        }
        break;
    }
  }, [currentState, t, isTrainingComplete, robots]);

  const toggleSettings = () => {  //SLider of settings
    setShowSettings(prev => !prev);
  };

  const toggleSilentMode = () => {
    setSilentMode(prev => !prev); //Switch to silent mode (no more sound from piano)
  };

  // Handle clicks outside settings panel to close it
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !settingsButtonRef.current.contains(event.target)
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleContinuousRecording = () => {//Starts continuous recording 
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

  const getThresholdLabel = value => { //slider infos for mic threshold
    if (value < 198) return t('very_sensitive');
    if (value < 215) return t('sensitive');
    if (value < 232) return t('less_sensitive');
    return t('very_less_sensitive');
  };

  const startContinuousRecording = async () => { //Handles continuous recording and freq analysis
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia n'est pas supporté par ce navigateur.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setAudioStream(stream);

    // Init and store audiocontext
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContextRef.current.createMediaStreamSource(stream);

    analyserRef.current = audioContextRef.current.createAnalyser();
    source.connect(analyserRef.current);

    analyserRef.current.fftSize = 2048; //FFT size chosen by trial and error, 2048 seems to work well
    setIsContinuousRecording(true);
  };

  const handleModeChange = async newMode => {
    setInputMode(newMode); // Update state to new mode
    if (user) {
      await user.reinitializeModel(newMode); // Reinitialize the model on the backend
      console.log('Model reinitialized for mode:', newMode);
    }
    setIsModeSelected(true); // Indicate that a mode has been selected
  };

  const proceedToPlayNote = () => {
    handleSetCurrentState(STATES.PlayNote);
  };

  useEffect(() => { //extract frequencies from audio signal
    
    if (isContinuousRecording && audioContextRef.current && analyserRef.current) {
      
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
    for (let i = 0; i < dataArray.length; i++) {//Finds max value in array, i think I should just use built-in fct but whatever
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    const maxFrequency = (maxIndex * audioContextRef.current.sampleRate) / analyserRef.current.fftSize; //maxFreq = freq with highest amplitude

    if (maxFrequency > 0 && maxValue > threshold) {
      // check if amplitude is above threshold

      setMaxFreq(maxFrequency);
      const noteDetected = frequencyToNoteNumber(maxFrequency);
      setNote(noteDetected);
    }

    if (isContinuousRecording) {
      requestAnimationFrame(getFrequencies); //update anim. note
    }
  };

  useEffect(() => {//While continuous recording, analyze freq.
    if (isContinuousRecording && analyserRef.current) {
      getFrequencies();
    }
  }, [isContinuousRecording]);

  const stopContinuousRecording = () => {
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

 

  const startRecording = async () => { //Start recording, but not continuous, then analyze with fft
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
      setShowPopup(true);
      let audioChunks = [];
      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      mediaRecorder.start();

      mediaRecorder.onstop = async () => { //handle recording done
        setIsRecording(false);
        setShowPopup(false);
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav; codecs=opus' });
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
        analyser.fftSize = 2048; //FFT size found by trial and error

        // start source
        source.start(0);

        source.onended = () => {
          const dataArray = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(dataArray);

          let frequencies = dataArray.map((_, index) => (index * audioContext.sampleRate) / analyser.fftSize);
          let amplitudes = dataArray.map(value => (value === -Infinity ? 0 : value));

          // Discard frequencies smaller than 200 and higher than 2000
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
        };
      };

      setTimeout(() => {
        mediaRecorder.stop();
      }, recordDuration);
    } catch (error) {
      console.error("Error trying to access mic:", error);
      setIsRecording(false);
      setShowPopup(false); // hide popup if error, else user is stuck
      alert(t('mic_error')); 
    }
  };
  const onClickGetRobots = async () => { //scan for robots
    const _robots = await user.getRobotsUuids();
    setRobots(_robots);
  };

  const onSelectRobot = async (robotUuid: string) => {//When robot selected, need 3s wait time to synchro if connection via dongle
    user.takeControl(robotUuid);

    setPopupMessage(t('connecting_robot'));
    setShowConnectingPopup(true);
    setControledRobot(robotUuid);
    setTimeout(() => {
      setShowConnectingPopup(false); // Hide popup after 3 secs
      handleSetCurrentState(STATES.ConsigneTraining);
    }, 3000);
  };

  const onAction = async (action: string) => {//explicit
    const currentNoteRecording = noteRecording;

    const newEntry = {
      uuid: controledRobot,
      action,
      captors: captorsForAction,
      note: currentNoteRecording,
    };
    setTrainer(trainer => [...trainer, newEntry]);
    
    await user.emitMotorEvent(controledRobot, action);

    setTimeout(async () => {
      await user.emitMotorEvent(controledRobot, 'STOP'); //stop motors
    }, 600);
   
  };

  const onExecute = async () => { //Send training data
    if (mode === 'TRAIN') {
      const data = trainer.map(({ action, captors, note }) => ({
        input: [...captors.map(captor => captor.toString()), note && noteToNumberMapping[note] ? noteToNumberMapping[note].toString() : '0'],
        output: action,
      }));
      

     
      const traindata = await user.trainModel(data, inputMode);
      setTrainingData(traindata);
    }
  };

  const stopExecutionAndReset = () => {
    if (mode === 'PREDICT') {
      setMode('TRAIN'); // Stop testing, comes back to training
    } else {
      setMode('PREDICT'); //Start testing mode
    }
    if (controledRobot) {
      user.emitMotorEvent(controledRobot, 'STOP'); // stops motors
    }
  };

  const resetModelAndTrainer = async () => {
    // Reinitialize model
    if (model && model != null) {
      await user.reinitializeModel(inputMode);

      setModel(null); // reset model State
    }

    // Reinitialize everything...
    setTrainer([]);
    stopExecutionAndReset();
    setMode('TRAIN');
    setIsModeSelected(false);
    setTrainingData([]);
    setShowInstructions(true);
    setIsTrainingComplete(false);
    setIsTrainingComponentLoaded(false);
    setIsExecuteClicked(false);

    
    handleSetCurrentState(STATES.ConsigneTraining);
    const updatedVisitedStates = {//Set the first 2 states as visited, no need to start from titlepage since the robot is connected already
      Title: true,
   
      ConsigneTraining: true
    };
    setVisitedStates(updatedVisitedStates);
  };

  useEffect(() => { // Predicts at regular intervals
    if (mode === 'PREDICT') {
      const interval = setInterval(() => {
        const data = user.captors.state[controledRobot].map(captor => captor.toString());
        if (typeof note === 'string') {
          const noteNumber = noteToNumberMapping[note] || 0; // Fallback to 0 if note is not found
          
          setSensorData(data);
          user
            .predict(controledRobot, data, noteToNumberMapping[note], isWinnerTakesAll, inputMode)
            .then(response => {
              setPredictions(response.predictions);
              setActivations(response.activations);
              
            })
            .catch(error => {
              console.error('Error during prediction:', error);
            });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [mode, controledRobot, note, user, isWinnerTakesAll, inputMode]);

  const handleTransition = () => {    //Only move to next state if note has been recorded
    if (noteRecording !== null && noteRecording !== '') {
      handleSetCurrentState(STATES.MapAction);
    } else {
      alert(t('no_note'));
    }
  };

  const renderCurrentState = () => { //BIG FUNCTION TO RENDER ALL STATES,
    // its mostly putting elements in place with instyle formatting
    switch (currentState) {
      case STATES.Title:
        return (
          <>
            {showConnectingPopup && (
              <div className="popup-overlay-title">
                <div className="popup-content-title">
                  <p>{popupMessage}</p>
                  <div className="spinner-container">
                    <div>
                      <l-momentum size="70" speed="1.1" color="white"></l-momentum>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <>
              <h1 style={{ fontSize: '44px' }}>{t('ai_tools_title')}</h1>
              <div style={{ flex: 1, marginRight: '20px', fontSize: '12pt' }}>
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
                  <button onClick={onClickGetRobots} className="getRobots-button">
                    {t('get_robots')}
                  </button>
                </div>
                <div className="robot-list">
                  {robots.map((robot, index) => (
                    <div key={index} className="card">
                      <button onClick={() => onSelectRobot(robot)} className="robot-button">
                        {robot}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          </>
        );
      case STATES.ConsigneTraining:
        return (
          <div>
            <div className="instructions-container">
              <h4>{t('instructions_title')}</h4>
              <ol>
                {/* Conditionally display instructs */}
                {isModeSelected ? (
                  <>
                    <li>{t('train_instruction_1')}</li>
                    <li>{t('train_instruction_2')}</li>
                    {inputMode !== 'NOTE_ONLY' && <li>{t('train_instruction_6')}</li>}

                    <li>{t('train_instruction_3')}</li>
                    <li>{t('train_instruction_4')}</li>
                  </>
                ) : (
                  <li>{t('train_instruction_5')}</li>
                )}
              </ol>
            </div>
            {!isModeSelected ? (
              <>
                {/* Show mode selection buttons only if mode is not yet selected */}
                <button className="use-captors-and-note-button" onClick={() => handleModeChange('CAPTORS_AND_NOTE')}>
                  {t('use_captors_and_note')}
                </button>
                <button className="use-note-only-button" onClick={() => handleModeChange('NOTE_ONLY')}>
                  {t('use_note_only')}
                </button>
              </>
            ) : (
              <button className="proceed-to-playnote-button" onClick={proceedToPlayNote}>
                {t('proceed_to_playnote')}
              </button>
            )}
          </div>
        );

      case STATES.PlayNote:
        return (
          <>
            <div
              className={`record-note-section ${noteRecording === '' ? 'blinking-border' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <label>{t('note_record_instruct')}</label>
              <button
                className="start-recording-button"
                onClick={() => {
                  startRecording();
                  setShowPopup(true);
                }}
                disabled={isRecording}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                  padding: '10px 20px',
                  gap: '10px',
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C13.1046 2 14 2.89543 14 4V11C14 12.1046 13.1046 13 12 13C10.8954 13 10 12.1046 10 11V4C10 2.89543 10.8954 2 12 2Z"
                    fill="currentColor"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M18 11V4C18 1.79086 16.2091 0 14 0C11.7909 0 10 1.79086 10 4V11C10 13.2091 11.7909 15 14 15V18H10V20H18V18H14V15C16.2091 15 18 13.2091 18 11Z"
                    fill="currentColor"
                  />
                </svg>
                {t('start_recording')}
              </button>
              {audioUrl && <button onClick={() => new Audio(audioUrl).play()}>{t('playback')}</button>}
              <div className="piano-container-original">
                <Piano onNoteChange={setNoteRecording} silentMode={silentMode} className="piano" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '20px' }}>
              <div className="note-recorded-section" style={{ flex: 1, maxHeight: '200px' }}>
                <label>{t('note_record_done')}</label>
                <div
                  className="note-recorded-display"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: '30px',
                  }}
                >
                  <MusicalStaff noteRecording={noteRecording} />
                  <p style={{ margin: '10px 0 0' }}>
                    {t('note_recorded')}: {noteRecording ? noteRecording : 'None'}
                  </p>
                </div>
              </div>
              {inputMode === 'CAPTORS_AND_NOTE' && (
                <div
                  className={`thymio-svg-container ${
                    noteRecording !== '' && inputMode === 'CAPTORS_AND_NOTE' ? 'blinking-border' : ''
                  }`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '240px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white',
                  }}
                >
                  <label
                    className="label-text"
                    style={{
                      alignSelf: 'flex-start',
                      margin: '10px 10px 0 10px',
                      fontWeight: 'bold',
                      textAlign: 'left',
                      color: 'white',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      padding: '2px 5px',
                    }}
                  >
                    {t('trig_sensors')}
                  </label>
                  <div
                    className="thymio-svg-component"
                    style={{
                      width: '100%',
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: '10px',
                      transform: 'scale(0.4)',
                    }}
                  >
                    <ThymioSVG captors={user.captors.state[controledRobot]} showTraits={false} />
                  </div>
                </div>
              )}
            </div>

            <div className="go-to-map-action-button-container" style={{ marginTop: '-10px' }}>
              <button
                className={`go-to-map-action-button ${noteRecording !== '' ? 'blinking-border' : ''}`}
                onClick={() => {
                  captureSensorValues();
                  handleTransition();
                }}
              >
                {inputMode === 'CAPTORS_AND_NOTE' ? t('go_to_map_action_captors') : t('go_to_map_action')}
              </button>
            </div>

            {showPopup && (
              <div className="popup-overlay">
                <div style={{ display: 'flex' }} className="popup-content-title">
                  <l-grid size="80" speed="1.5" color="white"></l-grid>
                </div>
                <p style={{ color: 'white', marginTop: '20px' }}>{t('Recording')}</p>
              </div>
            )}
          </>
        );

      case STATES.MapAction:
        // item for actions images, gifs and statics
        const gifSources = {
          STOP: stopGif,
          FORWARD: forwardGif,
          BACKWARD: backwardGif,
          LEFT: rightGif,
          RIGHT: leftGif,
        };

        const staticSources = {
          STOP: stopStatic,
          FORWARD: forwardStatic,
          BACKWARD: backwardStatic,
          LEFT: rightStatic,
          RIGHT: leftStatic,
        };
        
        //these handle hovering over images
        const handleMouseEnter = (button, action) => {
          const img = button.getElementsByTagName('img')[0];
          img.src = gifSources[action];
        };

        const handleMouseLeave = (button, action) => {
          const img = button.getElementsByTagName('img')[0];
          img.src = staticSources[action];
        };

        const handleDelete = index => {
          const newTrainer = trainer.filter((_, i) => i !== index);
          setTrainer(newTrainer); // Add combination input-action to trainer
        };

        const handleAction = async action => {
          if (noteRecording === '') {
            alert(t('no_note_recorded')); // Alert user, cannot map action without a note
            return; 
          }
          if (model && model != null) {
            await user.reinitializeModel(inputMode);

            setModel(null); // Reset to null model state
          }
          //Reset everything
          setIsTrainingComplete(false);
          setIsTrainingComponentLoaded(false);
          setIsExecuteClicked(false);
          setShowInstructions(true);
          setActionClicked(true);
          onAction(action);
        };

        return (
          <>
            <div
              className={`actions-container ${!actionClicked ? 'blinking-border' : ''}`}
              style={{ border: '2px solid #ccc', padding: '10px', marginBottom: '10px' }}
            >
              <h2 className="label-text actions-header">{t('choose_action')}</h2>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
                {Object.keys(gifSources).map(action => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    onMouseEnter={e => handleMouseEnter(e.currentTarget, action)}
                    onMouseLeave={e => handleMouseLeave(e.currentTarget, action)}
                    className="action-button"
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
                    <img src={staticSources[action]} alt={action} className="action-image" />
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
                          {inputMode !== 'NOTE_ONLY' && (
                            <td>
                              <ThymioSVG
                                captors={captors}
                                style={{ width: '100px', height: 'auto', marginLeft: '20px' }}
                                showTraits={false}
                              />
                            </td>
                          )}
                          <td style={{ position: 'relative' }}>
                            {' '}
                            {/* Appliquer position relative sur la dernière cellule normale */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <p style={{ margin: '0' }}>{note}</p>
                              <div style={{ transform: 'scale(0.7)', marginTop: '-20px' }}>
                                <MusicalStaff noteRecording={note} />
                              </div>
                            </div>
                            {/* Bouton de suppression positionné en haut à droite */}
                            <div className="delete-button-container">
                              <button className="delete-button" onClick={() => handleDelete(index)} aria-label="Delete">
                                &#10005;
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div
                  className={`map-more-actions-container ${actionClicked ? 'blinking-border' : ''}`}
                  style={{ paddingTop: '0px', border: '2px solid white', marginTop: '0px' }}
                >
                  <label className="label-text" style={{ position: 'relative', top: '0px', left: '-10px' }}>
                    2)
                  </label>
                  <button
                    onClick={() => handleSetCurrentState(STATES.PlayNote)}
                    className="map-more-actions-button"
                    style={{ marginBottom: '10px' }}
                  >
                    {t('map_more_actions')}
                  </button>
                  <div style={{ paddingTop: '0px', border: 'none', marginBottom: '10px' }}>
                    <label className="label-text" style={{ position: 'relative', top: '0px', left: '-10px' }}>
                      {t('or')}
                    </label>
                  </div>
                  <button
                    onClick={() => {
                      if (trainer.length > 0) {
                        handleSetCurrentState(STATES.ConsigneTesting);
                      } else {
                        alert(t('no_training_data'));
                      }
                    }}
                    className="test-model-button"
                  >
                    {t('test_the_model')}
                  </button>
                </div>
                <div className="button-container" style={{ padding: '10px', border: '2px solid white' }}>
                  <input
                    type="text"
                    className="filename-input"
                    placeholder={t('enter_filename')}
                    value={filename}
                    onChange={e => setFilename(e.target.value)}
                  />
                  <button onClick={() => saveTrainerToFile(filename)} style={{ marginBottom: '5px' }}>
                    {t('save_model')}
                  </button>
                  <button onClick={() => document.getElementById('fileInput').click()}>{t('load_other_model')}</button>
                  <input
                    type="file"
                    id="fileInput"
                    className="input-file"
                    onChange={handleFileUpload}
                    accept=".json"
                    style={{ display: 'none' }} // This makes sure the file input is not visible but can be triggered by the button
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
          <div className="popup-content-title">
            <p>{t('processing')}</p>
            <div className="spinner-container">
              <l-momentum size="70" speed="1.1" color="white"></l-momentum>
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
          <button onClick={handleExecute} className="execute-btn blinking-border">
            {t('execute')}
          </button>
        </div>
      )}

      {isTrainingComplete && ( //All the visualisation of the training goes here
        <div className="visualization-container">
          <label className="label-text neural-net-label">{t('Neuralnet_training')}</label>
          <div className="legend-gradient-container">
            <div className="legend-item legend-gradient-item">
              <div className="legend-gradient"></div>
              <div className="legend-text-container">
                <div className="legend-text" style={{ position: 'absolute', transform: 'translateY(-250%)' }}>{t('positive_activation')}</div>
                <div className="legend-text" style={{ position: 'absolute', transform: 'translateY(20%)' }}>{t('no_activation')}</div>
                <div className="legend-text" style={{ position: 'absolute', transform: 'translateY(300%)' }}>{t('negative_activation')}</div>
              </div>
            </div>
          </div>
          <div className="legend-neuron-container">
            <div className="legend-item">
              <div className="legend-circle" style={{ backgroundColor: 'blue' }}></div>
              <div className="legend-text">{t('input_neuron')}</div>
            </div>
            <div className="legend-item">
              <div className="legend-circle" style={{ backgroundColor: 'white' }}></div>
              <div className="legend-text">{t('intermediate_neuron')}</div>
            </div>
            <div className="legend-item">
              <div className="legend-circle" style={{ backgroundColor: 'orange' }}></div>
              <div className="legend-text">{t('output_neuron')}</div>
            </div>
          </div>
          <div className="neural-net-container">
            <NeuralNetworkVisualizationTraining
              showBiases={showBiases}
              trainingData={trainingData}
              inputMode={inputMode}
            />
          </div>
        </div>
      )}

      {isTrainingComponentLoaded && (
        <div className="button-container blinking-border">
          <label className="label-text">{t('Model_ready')}</label>
          <button onClick={() => { handleSetCurrentState(STATES.Testing); setMode('PREDICT'); }}>
            {t('testing')}
          </button>
        </div>
      )}
    </div>
  );


      case STATES.Testing:
        return (
          <div>
            {/* First line: Always the Piano for both modes */}
            <div
              className="piano-container-original"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                marginBottom: '20px',
                width: inputMode === 'CAPTORS_AND_NOTE' ? 'auto' : '100%', // Full width only in NOTE_ONLY
              }}
            >
              <div
                style={{
                  border: '1px solid white',
                  padding: '0px',
                  minWidth: inputMode === 'CAPTORS_AND_NOTE' ? '600px' : '100%', // Full width only in NOTE_ONLY
                  marginRight: inputMode === 'CAPTORS_AND_NOTE' ? '20px' : '0', // No margin on the right in NOTE_ONLY
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className={!note ? 'blinking-border' : ''}
                onClick={stopContinuousRecording}
              >
                <label style={{ textAlign: 'left', width: '100%' }}>
                  <span className="label-text">1) {t('playnote')}</span>
                </label>

                <Piano onNoteChange={setNote} silentMode={silentMode} className="piano" />
              </div>

              {/* Control buttons only in CAPTORS_AND_NOTE mode,  only on the first line */}
              {inputMode === 'CAPTORS_AND_NOTE' && (
                <div
                  style={{
                    border: '1px solid white',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <button onClick={stopExecutionAndReset} className="stop-testing-btn" style={{ marginBottom: '10px' }}>
                    {mode === 'PREDICT' ? t('stop_testing') : t('start_testing')}
                  </button>
                  {note !== null && note !== '' && (
                    <button
                      onClick={() => {
                        handleSetCurrentState(STATES.CurrentModelTest), setMode('PREDICT'), setIsWinnerTakesAll(true);
                      }}
                      className="visualize-nn-btn blinking-border"
                    >
                      {t('visualize_neural_network')}{' '}
                    </button>
                  )}
                 {showDecisionButton && (
                    <button onClick={() => setIsWinnerTakesAll(!isWinnerTakesAll)} className="switch-decision-btn">
                      {isWinnerTakesAll ? t('switch_to_probabilistic_decision') : t('switch_to_winner_takes_all')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      resetModelAndTrainer();
                      handleSetCurrentState(STATES.ConsigneTraining);
                    }}
                    className="reset-training-btn"
                  >
                    {t('reinitialize_the_model')}
                  </button>
                </div>
              )}
            </div>

            {/* Second line: Conditional rendering based on inputMode*/}
            <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '20px', height: '280px' }}>
              {' '}
             
              <div
                className="secondline"
                style={{
                  border: '1px solid white',
                  padding: '10px',
                  marginRight: '0px',
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                >
                <label style={{ textAlign: 'left' }}>
                  <span className="label-text">
                    2) {inputMode === 'CAPTORS_AND_NOTE' ? t('Input_received') : t('note_recorded')}
                  </span>
                </label>

                <button
                  onClick={toggleContinuousRecording}
                  className={`toggle-recording-btn ${!note ? 'blinking-border' : ''}`}
                  style={{
                    position: 'relative', 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '10px', 
                    
                  }}
                >
                  {isContinuousRecording ? t('stop_continuous_recording') : t('start_continuous_recording')}
                </button>
                <div style={{ flex: 1 }} className="input_components" >
                  {' '}
                  {/*div wraps the ThymioSVG + MusicalStaff */}
                  {inputMode === 'CAPTORS_AND_NOTE' ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <ThymioSVG
                        captors={user.captors.state[controledRobot]}
                        style={{ width: '150px', height: 'auto', marginRight: '20px' }}
                        showTraits={false}
                      />
                      <MusicalStaff noteRecording={note} />
                    </div>
                  ) : (
                    <MusicalStaff noteRecording={note} />
                  )}
                </div>
                <p style={{ margin: '-2px 0 0' }}>
                  {t('note_recorded')}: {note ? note : 'None'}
                </p>
              </div>
              <div
                className="barchart-container ${inputMode === 'NOTE_ONLY' ? 'note-only' : ''}" //BarChart
                style={{
                  border: '1px solid white',
                  padding: '0px',
                  flexGrow: inputMode === 'NOTE_ONLY' ? 3 : 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center', // Center content vertically
                }}
              >
                <label style={{ textAlign: 'left' }}>
                  <span className="label-text">3) {t('action_predicted')}</span>
                </label>
                <BarChart
                  data={predictions}
                  labels={labels}
                  theme={theme}
                  style={{ flexGrow: 1, overflow: 'hidden' }}
                />
              </div>
              {inputMode === 'NOTE_ONLY' && (
                <div
                className="control-buttons-container-original"
                style={{
                  border: '1px solid white',
                  padding: '10px',
                  flexGrow: 1,  
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                  <button onClick={stopExecutionAndReset} className="stop-testing-btn" style={{ marginBottom: '10px' }}>
                    {mode === 'PREDICT' ? t('stop_testing') : t('start_testing')}
                  </button>
                  {note !== '' && (
                    <button
                      onClick={() => {
                        handleSetCurrentState(STATES.CurrentModelTest), setIsWinnerTakesAll(true); //Sets is winner take all to true else id doesn't make sense
                      }}
                      className="visualize-nn-btn blinking-border"
                      style={{
                        marginBottom: '10px',
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                      }}
                    >
                      {t('visualize_neural_network')}
                    </button>
                  )}
                  {showDecisionButton && (
                    <button onClick={() => setIsWinnerTakesAll(!isWinnerTakesAll)} className="switch-decision-btn">
                      {isWinnerTakesAll ? t('switch_to_probabilistic_decision') : t('switch_to_winner_takes_all')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      resetModelAndTrainer();
                      handleSetCurrentState(STATES.ConsigneTraining);
                    }}
                    className="reset-training-btn"
                  >
                    {t('reinitialize_the_model')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
        

      case STATES.CurrentModelTest:
        if (!model && !loading) {
          loadModel();
        }
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0px', maxHeight: '100vh', overflow: 'hidden'}}>
              
              <div
                className="recording-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: '2px solid white',
                  marginRight: '0px',
                  marginTop: '-10px',
                }}
              >
                {note !== null && (
                  <div
                    className="note-display"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      margin: '0px',
                      border: '2px solid white',
                      marginTop: '-10px',
                    }}
                  >
                    <button
                      onClick={toggleContinuousRecording}
                      className="toggle-recording-btn"
                      style={{ marginBottom: '2px', borderWidth: '3px', width: '250px' }}
                    >
                      {isContinuousRecording ? t('stop_continuous_recording') : t('start_continuous_recording')}
                    </button>
                    <p>
                      {t('tone')}: {note}{' '}
                    </p>
                  </div>
                )}

                {/* div adjusted for ThymioSVG */}
                {inputMode === 'CAPTORS_AND_NOTE' && (
                  <div
                    style={{ width: '100%', flex: '2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <ThymioSVG
                      captors={user.captors.state[controledRobot]}
                      style={{ transform: 'rotate(45deg)', width: '180px', height: 'auto', marginTop: '1px' }}
                      showTraits={true}
                      onRectCoordinates={handleRectCoordinates}
                      onLoaded={() => setThymioSVGLoaded(true)}
                    />
                  </div>
                )}

                {/* div for musicalstaff*/}
                <div
                  ref={musicalStaffRef}
                  style={{ width: '100%', flex: '1', marginTop: '-30px', transform: 'scale(0.6)' }}
                >
                  <MusicalStaff noteRecording={note} onReady={() => setIsMusicalStaffMounted(true)} />
                </div>
              </div>

              {/* div for NeuralNetworkVisualization */}
              <div className="neural-network-container" id="neuralNetworkContainer" style={{ flexGrow: 1 }}>
                <NeuralNetworkVisualization
                  showBiases={showBiases}
                  model={model}
                  inputMode={inputMode}
                  activations={activations}
                  outputactiv={predictions}
                  sensorData={sensorData}
                  currentNote={noteToNumberMapping[note]}
                  onNeuronCoordinates={handleNeuronCoordinates}
                />
              </div>
            </div>

            {inputMode === 'NOTE_ONLY' && neuronCoords[0] && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 1100,
                  overflow: 'visible',
                }}
              >
                <line   //Draw arrow from note to neuron of note
                  x1={musicalStaffCoords.x}
                  y1={musicalStaffCoords.y}
                  x2={neuronCoords[0].x - 5}
                  y2={neuronCoords[0].y}
                  stroke="blue"
                  strokeWidth="4"
                  markerEnd="url(#arrowhead-red)"
                />
                <defs>
                  <marker id="arrowhead-red" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                    <polygon points="0 0, 6 2.5, 0 5" fill="blue" />
                  </marker>
                </defs>
              </svg>
            )}
            {inputMode === 'CAPTORS_AND_NOTE' && (
              <svg
                ref={svgRef}
                width="300"
                height="200"
                style={{
                  zIndex: 4005,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  overflow: 'visible',
                }}
                viewBox="0 0 300 200"
              >
                {adjustedRectCoords.map((rect, index) => {
                  const neuron = adjustedNeuronCoords[index];
                  if (neuron) {
                    return (
                      <>
                        <line   //draw the other arrows
                          key={index}
                          x1={rect.x}
                          y1={rect.y}
                          x2={neuron.x}
                          y2={neuron.y}
                          stroke="blue"
                          strokeWidth="4"
                          markerEnd="url(#arrowhead-note)"
                        />
                        <line />
                      </>
                    );
                  }
                  return null;
                })}
                <defs>
                  <marker id="arrowhead-note" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0, 7 2.5, 0 5" fill="blue" />
                  </marker>
                </defs>
              </svg>
            )}

            {inputMode === 'CAPTORS_AND_NOTE' && neuronCoords.length > 9 && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1100 }}>
                <line
                  x1={musicalStaffCoords.x}
                  y1={musicalStaffCoords.y}
                  x2={neuronCoords[9].x}
                  y2={neuronCoords[9].y}
                  stroke="blue"
                  strokeWidth="4"
                  markerEnd="url(#arrowhead-red)"
                />
                <defs>
                  <marker id="arrowhead-red" markerWidth="7" markerHeight="5" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="blue" />
                  </marker>
                </defs>
              </svg>
            )}

            <div
              style={{ display: 'flex', justifyContent: 'center', marginTop: '0px', marginBottom: '-23px' }}
              onClick={stopContinuousRecording}
            >
              {/* Div for piano */}
              <div className="piano-container" style={{ maxWidth: '1000px', flex: 1 }}>
                <Piano onNoteChange={setNote} silentMode={silentMode} className="piano" />
              </div>

              {/*Div for buttons  */}
              <div
                className="control-buttons-container"
                style={{ display: 'flex', justifyContent: 'space-around', flexDirection: 'column', marginLeft: '20px' }}
              >
                <button onClick={stopExecutionAndReset} className="stop-testing-btn" style={{ marginBottom: '10px' }}>
                  {mode === 'PREDICT' ? t('stop_testing') : t('start_testing')}
                </button>
                <button
                  onClick={() => handleSetCurrentState(STATES.Testing)}
                  style={{
                    marginBottom: '10px',
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                  }}
                >
                  {t('return_to_testing')}
                </button>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (// NavigationBar, joyride, settings button
    <>
      <NavigationBar
        className="navigation-bar"
        stopExecutionAndReset={stopExecutionAndReset}
        currentState={currentState}
        setCurrentState={setCurrentState}
        visitedStates={visitedStates}
        setMode={setMode}
        user={user}
        controledRobot={controledRobot}
      />
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
      <button className="TutorialButton" onClick={() => startTour()} aria-label={t('start_tour')}></button>
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
            primaryColor: theme === 'light' ? '#4a90e2' : '#d41313',
            textColor: theme === 'light' ? '#333' : '#fff',
            backgroundColor: theme === 'light' ? '#f7f7f7' : '#333',
            arrowColor: theme === 'light' ? '#dfe6e9' : '#76ABAE',
          },
          buttonNext: {
            color: theme === 'light' ? '#333' : '#fff',
            backgroundColor: theme === 'light' ? '#e6e6e6' : '#76ABAE',
          },
          buttonBack: {
            color: theme === 'light' ? '#333' : '#fff',
            backgroundColor: theme === 'light' ? '#e6e6e6' : '#76ABAE',
          },
          buttonSkip: {
            color: theme === 'light' ? '#333' : '#fff',
            backgroundColor: theme === 'light' ? '#e6e6e6' : '#76ABAE',
          },
        }}
        callback={handleJoyrideCallback}
      />
      <aside
        ref={menuRef}
        className={`DrawerMenu ${showSettings ? 'open' : ''} ${theme === 'light' ? 'light-theme' : ''}`}
        role="menu"
      >
        <nav className="Menu">
          <h2>{t('settings_panel')}</h2>
          <p>
            {t('current_input_mode')}: {inputMode === 'NOTE_ONLY' ? t('note_only') : t('captors_and_note')}
          </p>
          <div>
            <label htmlFor="recordDuration" style={{ fontSize: '14px' }}>
              {t('record_duration')} (s): <span>{recordDuration / 1000}</span>
            </label>
            <input
              ref={recordDurationRef}
              id="recordDuration"
              type="range"
              min="1"
              max="10"
              step="1"
              value={recordDuration / 1000}
              onChange={e => setRecordDuration(Number(e.target.value) * 1000)}
            />
          </div>
          <div className="MenuLink">
            <label style={{ fontSize: '14px' }} htmlFor="thresholdSlider">
              {t('threshold')}: {getThresholdLabel(threshold)}
            </label>
            <input
              ref={thresholdSliderRef}
              id="thresholdSlider"
              type="range"
              min="180"
              max="250"
              step="1"
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
            />
          </div>
          <button onClick={toggleSilentMode} className="MenuLink">
            {silentMode ? t('disable_silent_mode') : t('enable_silent_mode')}
          </button>
          <button onClick={() => resetModelAndTrainer()} className="MenuLink">
            {t('reset_model')}
          </button>

          <div style={{ fontSize: '14px' }}>
            <label htmlFor="toggleBiases"> {t('Show_biases')}</label>
            <input type="checkbox" id="toggleBiases" checked={showBiases} onChange={() => setShowBiases(!showBiases)} />
          </div>
          <div style={{ fontSize: '14px' }}>
            <label htmlFor="toggleDecisionButton">{t('show_decision_button')}</label>
            <input
              type="checkbox"
              id="toggleDecisionButton"
              checked={showDecisionButton}
              onChange={e => setShowDecisionButton(e.target.checked)}
            />
          </div>

          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}> 
            {theme === 'light' ? t('dark_theme') : t('light_theme')}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <button onClick={() => i18n.changeLanguage('fr')} className="MenuLink" title="Français">
              <span className="fi fi-fr"></span>
            </button>
            <button onClick={() => i18n.changeLanguage('de')} className="MenuLink" title="Deutsch">
              <span className="fi fi-de"></span>
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
