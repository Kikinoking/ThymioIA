import React from 'react';
import './Piano.css'; // Importation du fichier CSS

const getOctave = (index: number): number => {
    return Math.floor(index / 7) + 4; 
};

interface PianoProps {
  onNoteChange: (note: string) => void;
}

const Piano: React.FC<PianoProps> = ({ onNoteChange }) => {
    const handleClick = (note: string) => {
      onNoteChange(note); // Utilisez la prop onNoteChange
    };

  return (
    <div className="piano">
      <div className="white-keys">
        {['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'].map((note, index) => (
          <div key={index} className="white-key" onClick={() => handleClick(`${note}${getOctave(index)}`)}>
            <span className="white-key-label">{note}</span>
            <span className="octave-label">{getOctave(index)}</span>
          </div>
        ))}
      </div>
      <div className="black-keys">
        {['C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5'].map((note, index) => (
          <div key={index} className="black-key" onClick={() => handleClick(note)}>
            {note}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Piano;
