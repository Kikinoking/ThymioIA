import React, { useEffect } from 'react';
import TrebleClef from 'D:/EPFL/Robproj/ThymioIA/src/assets/treble-clef.svg';

const notesPosition: { [key: string]: number } = {
    'C': 120, // Ajusté pour les positions plus basses
    'C#': 110,
    'D': 110,
    'D#': 90,
    'E': 100,
    'F': 90,
    'F#': 60,
    'G': 80,
    'G#': 40,
    'A': 70,
    'A#': 20,
    'B': 60
};

interface MusicalStaffProps {
  noteRecording: string | null;
  onReady?: () => void; 
}

const MusicalStaff: React.FC<MusicalStaffProps> = ({ noteRecording, onReady }) => {
    const note = noteRecording ? noteRecording.slice(0, -1) : 'A';
    const sharp = note.includes('#');
    const octave = noteRecording ? noteRecording.slice(-1) : '6';
    const yPos = notesPosition[note.replace('#', '')] - (parseInt(octave, 10) - 4) * 79;

    useEffect(() => {
        if (onReady) {
            onReady(); 
        }
    }, [onReady]);

    const sharpX = 140;
    const sharpY = yPos + 28;

    const needsBarThrough = (noteRecording === 'A5' || noteRecording === 'C4');
    const needsBarTangent = (noteRecording === 'B5');

    return (
        <svg width="200" height="170" style={{ border: '1px solid black', backgroundColor: 'white' }}>
            {[30, 50, 70, 90, 110].map((y, index) => (
                <line key={index} x1="10" y1={y + 20} x2="190" y2={y + 20} stroke="black" strokeWidth="1" />
            ))}
            <image href={TrebleClef} x="10" y="48" height="90px" />
            {sharp && <text x={sharpX} y={sharpY + 20} fontFamily="Arial" fontSize="20px" fill="black">#</text>}
            <circle cx="130" cy={yPos + 40} r="6" fill="black" />
            {needsBarThrough && <line x1="120" x2="140" y1={yPos + 40} y2={yPos + 40} stroke="black" strokeWidth="2" />}
            {needsBarTangent && <line x1="120" x2="140" y1={yPos + 46} y2={yPos + 46} stroke="black" strokeWidth="2" />}
        </svg>
    );
};

export default MusicalStaff;
