// Fichier MusicalStaff.tsx
import React, { useEffect } from 'react';
import TrebleClef from 'D:/EPFL/Robproj/ThymioIA/src/assets/treble-clef.svg';

const notesPosition: { [key: string]: number } = {
    'C': 110,
    'C#': 100,
    'D': 100,
    'D#': 80,
    'E': 90,
    'F': 80,
    'F#': 50,
    'G': 70,
    'G#': 30,
    'A': 60,
    'A#': 10,
    'B': 50
};

interface MusicalStaffProps {
  noteRecording: string | null;
  onReady?: () => void; 
}

const MusicalStaff: React.FC<MusicalStaffProps> = ({ noteRecording, onReady }) => {
    const note = noteRecording ? noteRecording.slice(0, -1) : 'A';
    const sharp = note.includes('#');
    const octave = noteRecording ? noteRecording.slice(-1) : '6';
    const yPos = notesPosition[note.replace('#', '')] - (parseInt(octave, 10) - 4) * 70;

    useEffect(() => {
        if (onReady) {
            onReady(); 
        }
    }, [onReady]);

    const sharpX = 140;
    const sharpY = yPos + 8;

    return (
        <svg width="200" height="150" style={{ border: '1px solid black', backgroundColor: 'white' }}>
            {[10, 30, 50, 70, 90].map((y, index) => (
                <line key={index} x1="10" y1={y + 20} x2="190" y2={y + 20} stroke="black" strokeWidth="1" />
            ))}
            <image href={TrebleClef} x="10" y="28" height="90px" />
            {sharp && <text x={sharpX} y={sharpY + 20} fontFamily="Arial" fontSize="20px" fill="black">#</text>}
            <circle cx="130" cy={yPos + 20} r="6" fill="black" />
        </svg>
    );
};

export default MusicalStaff;
