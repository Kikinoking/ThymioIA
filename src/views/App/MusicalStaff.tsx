// Fichier MusicalStaff.tsx
import React from 'react';
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
}

const MusicalStaff: React.FC<MusicalStaffProps> = ({ noteRecording }) => {
    const note = noteRecording ? noteRecording.slice(0, -1) : 'A';
    const sharp = note.includes('#'); // Vérifiez si c'est un dièse
    const octave = noteRecording ? noteRecording.slice(-1) : '6';
    const yPos = notesPosition[note.replace('#', '')] - (parseInt(octave, 10) - 4) * 70;

    
  
    const sharpX = 140; // Position X pour le dièse, ajustez en fonction de votre layout
    const sharpY = yPos +8; // Position Y pour le dièse, ajustez légèrement au-dessus de la note
  
    return (
        <svg width="200" height="150" style={{ border: '1px solid black' ,backgroundColor: 'white'}}>
        {/* Dessiner les lignes de la portée */}
        {[10, 30, 50, 70, 90].map((y, index) => (
            <line key={index} x1="10" y1={y + 20} x2="190" y2={y + 20} stroke="black" strokeWidth="1" />
        ))}
        {/* Inclure la clé de sol */}
        <image href={TrebleClef} x="10" y="28" height="90px" />
        {/* Dessiner le dièse si nécessaire */}
        {sharp && <text x={sharpX} y={sharpY + 20} fontFamily="Arial" fontSize="20px" fill="black">#</text>}
        {/* Dessiner la note */}
        <circle cx="130" cy={yPos + 20} r="6" fill="black" />
        </svg>

      
    );
  };

export default MusicalStaff;
