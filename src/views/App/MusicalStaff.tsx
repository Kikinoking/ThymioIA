/**
 * MusicalStaff.tsx
 * 
 * Renders a musical staff component that displays notes graphically using SVG.
 * It adjusts note positions based on a hardcoded mapping (bcs reasons) and supports the display of sharps lines.
 * TrebleClef from (SVG Repo) : https://www.svgrepo.com/svg/98269/treble-clef
 */
import * as React from 'react';
import { useEffect } from 'react';
import TrebleClef from './../../assets/treble-clef.svg';

// Hardcode positions because no better solution was found
const notesPosition: { [key: string]: number } = {
  C4: 130,
  'C#4': 130,
  D4: 125,
  'D#4': 125,
  E4: 120,
  F4: 110,
  'F#4': 110,
  G4: 100,
  'G#4': 100,
  A4: 90,
  'A#4': 90,
  B4: 80,
  C5: 70,
  'C#5': 70,
  D5: 60,
  'D#5': 60,
  E5: 50,
  F5: 40,
  'F#5': 40,
  G5: 34,
  'G#5': 34,
  A5: 27,
  'A#5': 27,
  B5: 20,
  C6: 14,
};

interface MusicalStaffProps { //need props
  noteRecording: string | null;
  onReady?: () => void;
}

const MusicalStaff: React.FC<MusicalStaffProps> = ({ noteRecording, onReady }) => {
  const note = noteRecording || '';

  useEffect(() => { //To transmit when ready to app.tsx, to render elements in right order
    if (onReady) {
      onReady();
    }
  }, [onReady]);

  const yPos = notesPosition[note];
  const isNoteDefined = yPos !== undefined;
  const sharp = note.includes('#');
  const sharpX = 140;
  const sharpY = yPos + 7;

  const needsBarThrough = ['A5', 'C4', 'C6', 'A#5', 'C#4'].includes(note);
  const needsBarTangent = note === 'B5';
  const needsExtraBar = note === 'C6';

  return (
    <svg width="200" height="150" style={{ border: '1px solid black', backgroundColor: 'white' }}>
      {[40, 60, 80, 100, 120].map((y, index) => (
        <line key={index} x1="10" y1={y} x2="190" y2={y} stroke="black" strokeWidth="1" />
      ))}
      <image href={TrebleClef} x="10" y="40" height="90px" />
      {sharp && isNoteDefined && (
        <text x={sharpX} y={sharpY} fontFamily="Arial" fontSize="20px" fill="black">
          #
        </text>
      )}
      {isNoteDefined && (
        <>
          <circle cx="130" cy={yPos} r="6" fill="black" />
          {needsBarThrough && <line x1="120" x2="140" y1={yPos} y2={yPos} stroke="black" strokeWidth="2" />}
          {needsBarTangent && <line x1="120" x2="140" y1={yPos + 6} y2={yPos + 6} stroke="black" strokeWidth="2" />}
          {needsExtraBar && <line x1="120" x2="140" y1={yPos + 10} y2={yPos + 10} stroke="black" strokeWidth="2" />}
        </>
      )}
    </svg>
  );
};

export default MusicalStaff;
