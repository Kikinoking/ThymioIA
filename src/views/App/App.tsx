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
  const [note, setNote] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const chartRef = useRef(null);
  const [chart, setChart] = useState(null);
  const [maxFreq, setMaxFreq] = useState(null);

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
  }, [chart]);

  const updateChart = (frequencies, amplitudes) => {
    if (chart) {
      chart.data.labels = frequencies;
      chart.data.datasets[0].data = amplitudes;
      chart.update();
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia n'est pas supporté par ce navigateur.");
      return;
    }
  
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
  
    let audioChunks = [];
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
  
    mediaRecorder.start();
    setIsRecording(true);
  
    mediaRecorder.onstop = async () => {
      setIsRecording(false);
      const audioBlob = new Blob(audioChunks, { 'type': 'audio/wav; codecs=opus' });
  
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const newAudioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(newAudioUrl);
  
      // Analyse de l'audio pour extraire la fréquence
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      //analyser.connect(audioContext.destination);
  
      analyser.fftSize = 4096;
      source.onended = () => {
        let floatDataArray = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(floatDataArray);

        let sampleRate = audioContext.sampleRate;
        let frequencies = floatDataArray.map((value, index) => index * (sampleRate / analyser.fftSize));
        
        // Trouver l'indice de la fréquence avec l'amplitude la plus élevée
        let maxAmplitudeIndex = floatDataArray.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
        let maxAmplitudeFrequency = frequencies[maxAmplitudeIndex];
        let maxAmplitude = floatDataArray[maxAmplitudeIndex];
        let amplitudes = Array.from(floatDataArray).map(value => value === -Infinity ? 0 : value); // Convertir -Infinity en 0 pour l'affichage
        let filteredFrequencies = [];
        let filteredAmplitudes = [];
        for (let i = 0; i < frequencies.length; i++) {
           if (frequencies[i] >= 200 && frequencies[i] <= 2001) {
              filteredFrequencies.push(frequencies[i]);
              filteredAmplitudes.push(amplitudes[i]);
          }
        }

        setMaxFreq(maxAmplitudeFrequency);
        if (maxAmplitudeFrequency) {
          const noteDetected = frequencyToNoteNumber(maxAmplitudeFrequency);
          setNote(noteDetected);
        } else {
          setNote(null);
        }

        updateChart(filteredFrequencies, filteredAmplitudes);
        console.log(filteredFrequencies, filteredAmplitudes);
        setMaxFreq(maxAmplitudeFrequency);
        console.log(`Fréquence avec l'amplitude la plus élevée: ${maxAmplitudeFrequency} Hz, Amplitude: ${maxAmplitude} dB`);
        
      };

      analyser.connect(audioContext.destination);
      source.start(0);
      setIsRecording(false);
    };
  
    
    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000);
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
  };

  const onExecute = async () => {
    const data = trainer.map(({ action, captors }) => ({
      input: captors.map(captor => captor.toString()),
      output: action,
    }));

    await user.trainModel(data);
    setMode('PREDICT');
  };

  useEffect(() => {
    if (mode === 'PREDICT') {
      const data = user.captors.state[controledRobot].map(captor => captor.toString());
      user.predict(controledRobot, data);
    }
  }, [mode, user.captors.state, controledRobot]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'PREDICT') {
        const data = user.captors.state[controledRobot].map(captor => captor.toString());
        user.predict(controledRobot, data);
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
          <button onClick={startRecording} disabled={isRecording}>
          <div className='max-frequency-display'>
              {maxFreq !== null && (
              <p>Fréquence Max: {maxFreq.toFixed(2)} Hz</p>
               )}
          </div>
          <div className='note-display'>
            {note && (
              <p>Note: {note}</p>
            )}
          </div>

            {isRecording ? 'Enregistrement...' : 'Enregistrer Audio'}</button>
            {audioUrl && <button onClick={() => new Audio(audioUrl).play()}>Playback</button>}
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
            {trainer.map(({ action, captors }, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '250px',
                  height: '1.2rem',
                }}
              >
                <p>{action}</p>
                <pre>{JSON.stringify(captors, null)}</pre>
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
