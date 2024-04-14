import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart ,registerables} from 'chart.js';
import './App.css';
import { thymioManagerFactory } from '../../Entities/ThymioManager';
import { observer } from 'mobx-react';
import { noteToNumberMapping } from '../../noteMapping';
import React from 'react';
import BarChart from './BarChart';
import ThymioSVG from '../ThymioSVG';
import Piano from './Piano'
import MusicalStaff from './MusicalStaff'; // Assurez-vous que le chemin est correct
import './Menu.css';
import SettingsIcon from 'D:/EPFL/Robproj/ThymioIA/src/assets/settings.svg'


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

//For bar chart$

  const [predictions, setPredictions] = React.useState([0.2, 0.3, 0.1, 0.15, 0.25]); 
  const labels = ["STOP", "FORWARD", "BACKWARD", "LEFT", "RIGHT"]; 

  const [activeTab, setActiveTab] = useState('Training');
  
  const switchTab = (tabName) => {
    // Appeler stopExecutionAndReset si on change vers l'onglet 'Training'
    if (tabName === 'Training') {
      stopExecutionAndReset();
    }
    setActiveTab(tabName);
  };

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
  }, []); // N'incluez pas showSettings ici pour éviter de réattacher l'écouteur inutilement





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
    await user.reinitializeModel(newMode); // Reinitialize the model on the backend
    console.log("Model reinitialized for mode:", newMode);
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
  


   return (
    <>
      
      <button 
                ref={settingsButtonRef}
                onClick={toggleSettings}
                className="OpenMenuButton"
                aria-label="Toggle settings"
            >
                <img src={SettingsIcon} alt= {showSettings ? 'CLOSE SETTINGS' : 'OPEN SETTINGS'}/>
                
            </button>

            <aside ref={menuRef} className={`DrawerMenu ${showSettings ? 'open' : ''}`} role="menu">
                <nav className="Menu">
                    <h2>Settings Panel</h2>
                    <p>Current Input Mode: {inputMode === 'NOTE_ONLY' ? 'Note Only' : 'Captors and Note'}</p>
                    <button onClick={() => handleModeChange('CAPTORS_AND_NOTE')} className="MenuLink">
                      Use Captors and Note
                    </button>
                    <button onClick={() => handleModeChange('NOTE_ONLY')} className="MenuLink">
                      Use Note Only
                    </button>
                    <div className="MenuLink">
                        <label htmlFor="thresholdSlider">Threshold: {threshold} </label>
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
                      {silentMode ? 'Disable Silent Mode' : 'Enable Silent Mode'}
                    </button>
                </nav>
                <div className="MenuOverlay" onClick={() => setShowSettings(false)} />
            </aside>

      <h1>{controledRobot === '' ? 'AI Tools : ThymioAI' : (activeTab === 'Testing' ? 'Testing mode' : 'Training mode')}</h1>
      
      {controledRobot === '' ? (
        <div style={{ flex: 1, marginRight: '20px' }}>
          <div className="card">
            <button onClick={onClickGetRobots}>getRobots</button>
          </div>
          {robots.map((robot, index) => (
            <div key={index} className="card">
              <button onClick={() => onSelectRobot(robot)}>{robot}</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '20px' }}>
            <button onClick={() => switchTab('Training')}>Training</button>
            <button onClick={() => switchTab('Testing')}>Testing</button>
          </div>
  
          {activeTab === 'Training' && (
            <div style={{ flex: 1, marginRight: '20px' }}>
              <br />
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <button onClick={() => onAction('STOP')}>STOP</button>
                <button onClick={() => onAction('FORWARD')}>FORWARD</button>
                <button onClick={() => onAction('BACKWARD')}>BACKWARD</button>
                <button onClick={() => onAction('LEFT')}>LEFT</button>
                <button onClick={() => onAction('RIGHT')}>RIGHT</button>
              </div>
              <br />
              <button onClick={startRecording} disabled={isRecording}>
                Record duration: {recordDuration / 1000} seconds
                <input
                  id="recordDuration"
                  type="range"
                  min="1000"
                  max="10000"
                  step="1000"
                  value={recordDuration}
                  onChange={(e) => setRecordDuration(Number(e.target.value))}
                />
              </button>
              <br />
              {audioUrl && <button onClick={() => new Audio(audioUrl).play()}>Playback</button>}
              {maxDetectedFreq !== null && (
                <div className='max-frequency-display' style={{ maxWidth: '300px', margin: '0 auto' }}>
                  <p>Max frequency: {maxDetectedFreq.toFixed(2)} Hz</p>
                </div>
              )}
              {noteRecording !== null && noteRecording !== 0 && (
                <div className='note-display' style={{ maxWidth: '300px', margin: '0 auto' }}>
                  <p>Tone: {noteRecording}</p>
                  <MusicalStaff noteRecording={noteRecording} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                {user.captors.state[controledRobot] && (
                  <div style={{ marginLeft: '20px', flexShrink: 0 }}>
                    <ThymioSVG captors={user.captors.state[controledRobot]} />
                  </div>
                )}
                <br />
                {silentMode &&(
               <>
              <Piano onNoteChange={setNoteRecording} />
              
              </>)}

              </div>
            </div>
          )}
  
          {activeTab === 'Testing' && (
            <div style={{ flex: 1, marginLeft: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flexGrow: 1, marginRight: '5px' }}>
                  <BarChart data={predictions} labels={labels} />
                </div>

                {user.captors.state[controledRobot] && (
                  <div style={{ transform: 'scale(0.7)' }}>
                    <ThymioSVG captors={user.captors.state[controledRobot]} />
                  </div>
                )}
              </div>

              {trainer.map(({ action, captors, note }, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '5px' }}>
                  <span>Action: {action}, </span>
                  <span>Captors: [{captors.join(', ')}], </span>
                  <span>Note: {note}</span>
                </div>
              ))}
              <br />
              <button onClick={onExecute} style={{ marginBottom: '20px' }}>EXECUTE</button>
              <br />
              <button onClick={toggleContinuousRecording} style={{ marginBottom: '20px' }}>
            {isContinuousRecording ? 'Stop continuous recording' : 'Start continuous recording'}
            {maxFreq !== null && (
              <div className='max-frequency-display'>
                <p>Max frequency: {maxFreq.toFixed(2)} Hz</p>
              </div>
            )}
            {note !== null && note !== 0 && (
              <div className='note-display' style={{ marginBottom: '40px' }}>
                <p style={{ marginBottom: '20px' }}>Tone: {note}</p>
                <MusicalStaff noteRecording={note} />
              </div>
            )}
            </button>
            {silentMode &&(
               <>
              <Piano onNoteChange={setNote} />
              
              </>)}

              <br />

              <button onClick={stopExecutionAndReset} style={{ marginTop: '20px' }}>Stop Testing</button>
              <button onClick={() => setIsWinnerTakesAll(!isWinnerTakesAll)} style={{ margin: '20px' }}>
                {isWinnerTakesAll ? "Switch to probabilistic decision" : "Switch to Winner-Takes-All"}
              </button>
              <button onClick={resetModelAndTrainer} style={{ marginBottom: '20px' }}>Reinitialize the model</button>
            </div>
          )}
        </div>
      )}
    </>
  );

  
  
  


      
  
  
  
  
  
  
  
  
  
  
});

export default App;
