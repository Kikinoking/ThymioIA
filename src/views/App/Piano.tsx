import React from 'react';
import './Piano.css'; // Importation du fichier CSS

const getOctave = (index) => {
    
    return Math.floor(index / 7) + 4; 
  };
  

const Piano = ({ setNoteRecording }) => {
  const handleClick = (note) => {
    setNoteRecording(note);
  };



  return (
    <div className="piano">
      {/* White keys */}
      <div className="white-keys">
        {['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'].map((note, index) => (
          <div key={index} className="white-key" onClick={() => handleClick(`${note}${getOctave(index)}`)}>
             <span className="white-key-label">{note}</span>
             <span className="octave-label">{getOctave(index)}</span>
          </div>
        ))}
      </div>

      {/* Black keys */}
      <div className="black-keys">
        <div className="black-key" style={{ left: '27px' }} onClick={() => handleClick('C#4')}>C#</div>
        <div className="black-key" style={{ left: '65px' }} onClick={() => handleClick('D#4')}>D#</div>
        
        <div className="black-key" style={{ left: '137px' }} onClick={() => handleClick('F#4')}>F#</div>
        <div className="black-key" style={{ left: '173px' }} onClick={() => handleClick('G#4')}>G#</div>
        <div className="black-key" style={{ left: '210px' }} onClick={() => handleClick('A#4')}>A#</div>

        <div className="black-key" style={{ left: '285px' }} onClick={() => handleClick('C#5')}>C#</div>
        <div className="black-key" style={{ left: '320px' }} onClick={() => handleClick('D#5')}>D#</div>

        <div className="black-key" style={{ left: '392px' }} onClick={() => handleClick('F#5')}>F#</div>
        <div className="black-key" style={{ left: '428px' }} onClick={() => handleClick('G#5')}>G#</div>
        <div className="black-key" style={{ left: '465px' }} onClick={() => handleClick('A#5')}>A#</div>

        
      </div>
    </div>
  );
};

export default Piano;
