/**
 * Piano.tsx
 *
 * A virtual piano component that uses Soundfont for sound synthesis.
 * This component allows playing notes interactively with mouse actions.
 * It supports a silent mode where no sound is generated, useful for non-auditory testing. (ik you could just turn computer sound off but its for the flex...)
 */

import { useEffect, useState } from 'react';
import './Piano.css';
import * as Soundfont from 'soundfont-player';

const getOctave = index => {
  return Math.floor(index / 7) + 4; //simple function to return octave
};

interface PianoProps { //props for silentmode, classname is opt.
  onNoteChange: (note: string) => void;
  silentMode: boolean;
  className?: string; 
}


const Piano: React.FC<PianoProps> = ({ onNoteChange, silentMode, className }) => {
  const [instrument, setInstrument] = useState(null);
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  useEffect(() => { //Set instrument as piano acoustic
    Soundfont.instrument(audioContext, 'acoustic_grand_piano').then(piano => {
      setInstrument(piano);
    });
  }, []);

  const handlePlayNote = (note: string) => {
    if (!silentMode && instrument) {
      instrument.play(note);
    }
    onNoteChange(note);
  };
//draws the piano on screen
  return (
    <div className={`piano ${className}`}> 
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
