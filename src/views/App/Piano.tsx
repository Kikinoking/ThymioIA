import React, { useEffect, useState } from 'react';
import './Piano.css';
import Soundfont from 'soundfont-player';

const getOctave = (index) => {
  return Math.floor(index / 7) + 4;
};

interface PianoProps {
  onNoteChange: (note: string) => void;
  silentMode: boolean;  // Adding silentMode to the interface
}

const Piano: React.FC<PianoProps> = ({ onNoteChange, silentMode }) => {
  const [instrument, setInstrument] = useState(null);
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  useEffect(() => {
    Soundfont.instrument(audioContext, 'acoustic_grand_piano').then(piano => {
      setInstrument(piano);
    });
  }, []);

  const handlePlayNote = (note: string) => {
    if (!silentMode && instrument) {  // Check if silentMode is false before playing the note
      instrument.play(note);
      
    }
    onNoteChange(note);
  };

  return (
    <div className="piano">
      <div className="white-keys">
        {['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'].map((note, index) => (
          <div key={index} className="white-key" onMouseDown={() => handlePlayNote(`${note}${getOctave(index)}`)}>
            <span className="white-key-label">{note}</span>
            <span className="octave-label">{getOctave(index)}</span>
          </div>
        ))}
      </div>
      <div className="black-keys">
        {['C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5'].map((note, index) => (
          <div key={index} className="black-key" onMouseDown={() => handlePlayNote(note)}>
            {note}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Piano;
