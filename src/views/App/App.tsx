import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart ,registerables} from 'chart.js';
import './App.css';
import { thymioManagerFactory } from '../../Entities/ThymioManager';
import { observer } from 'mobx-react';

Chart.register(...registerables);
const user = thymioManagerFactory({ user: 'AllUser', activity: 'ThymioIA', hosts: ['localhost'] });

function frequencyToNoteNumber(frequency) {
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);
  if (frequency === 0) return null; // Gérer le cas zéro
  let h = Math.round(12 * Math.log2(frequency / C0));
  let octave = Math.floor(h / 12);
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  let n = h % 12;
  let note = noteNames[n];
  return note + octave;
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


  const [recordDuration, setRecordDuration] = useState(5000);  //Record duration

  const [robots, setRobots] = useState<string[]>([]);
  const [controledRobot, setControledRobot] = useState<string>('');
  const [trainer, setTrainer] = useState<{ uuid: string; action: string; captors: number[] }[]>([]);
  const [mode, setMode] = useState<'TRAIN' | 'PREDICT'>('TRAIN');

  useEffect(() => {
    if (chartRef.current && !chart) {
      const newChart = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Amplitude (dB)',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.15
          }]
        },
        options: {
          scales: {
            x: {
              title: {
                display: true,
                text: 'Fréquence (Hz)',
                font: {
                  size: 16
                }
              }
            },
            y: {
              title: {
                display: true,
                text: 'Amplitude (dB)',
                font: {
                  size: 16
                }
              }
            }
          },
          plugins: {
            
            legend: {
              display: true,
              labels: {
                font: {
                  size: 14
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

  useEffect(() => {
    // Vérifiez que audioContext et analyser sont définis avant de démarrer getFrequencies
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
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    const maxFrequency = maxIndex * audioContextRef.current.sampleRate / analyserRef.current.fftSize;
    setMaxFreq(maxFrequency);
    const noteDetected = frequencyToNoteNumber(maxFrequency);
    setNote(noteDetected);
    if (isContinuousRecording) {
      requestAnimationFrame(getFrequencies);
    }
  };


  // Utilisez useEffect pour démarrer l'analyse lorsque isContinuousRecording est true.
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
  setNote(detectedNote);
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
    setTrainer([...trainer, { uuid: controledRobot, action, captors: user.captors.state[controledRobot] }]);
    await user.emitMotorEvent(controledRobot, action);
    const currentNote = noteRecording;

 
    setTrainer([...trainer, { uuid: controledRobot, action, captors: user.captors.state[controledRobot], note: currentNote }]);
    await user.emitMotorEvent(controledRobot, action);

  };

  const onExecute = async () => {
    if (mode === 'TRAIN') {
      const data = trainer.map(({ action, captors, }) => ({
        input: [...captors.map(captor => parseFloat(captor)), note ? parseFloat(note) : 0],
        output: action,
      }));
  
      console.log("Verifying input sizes:", data.map(d => d.input.length));
      await user.trainModel(data);
      setMode('PREDICT');
    }
  };

  useEffect(() => {
    if (mode === 'PREDICT') {
      const data = user.captors.state[controledRobot].map(captor => captor.toString());
      user.predict(controledRobot, data, note);
    }
  }, [mode, user.captors.state, controledRobot]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'PREDICT') {
        const data = user.captors.state[controledRobot].map(captor => captor.toString());
        user.predict(controledRobot, data, note);
      }
    }, 1000);

    return () => clearInterval(interval);
  });

  return (
    <>
      <h1>ThymioAI</h1>
      
      {controledRobot !== '' ? (
        <>
          <button onClick={() => onAction('STOP')}>STOP</button>
          <button onClick={() => onAction('FORWARD')}>FORWARD</button>
          <button onClick={() => onAction('BACKWARD')}>BACKWARD</button>
          <button onClick={() => onAction('LEFT')}>LEFT</button>
          <button onClick={() => onAction('RIGHT')}>RIGHT</button>
          <br />
           
          <button onClick={startRecording} disabled={isRecording}>
            {/* Slider pour ajuster la durée de l'enregistrement */}
          <label htmlFor="recordDuration">Durée d'enregistrement: {recordDuration / 1000} secondes</label>
          <input
            id="recordDuration"
            type="range"
            min="1000"
            max="10000"
            step="1000"
            value={recordDuration}
            onChange={(e) => setRecordDuration(Number(e.target.value))}
          />
          <div className='max-frequency-display'>
              {maxFreq !== null && (
              <p>Fréquence Max: {maxDetectedFreq.toFixed(2)} Hz</p>
               )}
          </div>
          <div className='note-display'>
            {noteRecording && (
              <p>Note: {noteRecording}</p>
            )}
          </div>

            {isRecording ? 'Enregistrement...' : 'Enregistrer Audio'}</button>
            <br />
            {audioUrl && <button onClick={() => new Audio(audioUrl).play()}>Playback</button>}
        <br />
        <button onClick={toggleContinuousRecording}>
            {isContinuousRecording ? 'Arrêter l\'enregistrement continu' : 'Démarrer l\'enregistrement continu'}
            <div className='note-display'>
          {maxFreq !== null && (
          <p>Fréquence Max: {maxFreq.toFixed(2)} Hz</p>
        )}
        </div>
        <div className='note-display'>
            {note && (
              <p>Note: {note}</p>
            )}
          </div>
        </button>
        
          <canvas ref={chartRef} width="400" height="400"></canvas>
          <pre>{JSON.stringify(user.captors.state, null)}</pre>

          <div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    width: '100%',
  }}
>
  {trainer.map(({ action, captors,  note }, index) => (
    <div
      key={index}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%', // Assurez-vous que cela est suffisant pour une ligne
        marginBottom: '5px', // Espace entre les éléments
      }}
    >
      <span>{`Action: ${action}, `}</span>
      <span>{`Captors: [${captors.join(', ')}], `}</span>
      <span>{`Note: ${note}`}</span>
    </div>
  ))}
  <br />
  <button onClick={onExecute}>EXECUTE</button>
</div>
        </>
      ) : (
        <>
          <div className="card">
            <button onClick={onClickGetRobots}>getRobots</button>
          </div>

          {robots.map((robot, index) => (
            <div key={index} className="card">
              <button onClick={() => onSelectRobot(robot)}>
                <p>{robot}</p>
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
});

export default App;
