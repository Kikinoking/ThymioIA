const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const noteToNumberMapping: { [key: string]: number } = {};

// Convertit une note et une octave en un numéro unique pour faciliter la comparaison.
function noteValue(note, octave) {
  const noteIndex = notes.indexOf(note);
  return octave * 12 + noteIndex; // 12 notes par octave
}

const valueC4 = noteValue("C", 4);
const valueC6 = noteValue("C", 6);

let currentIndex = 1; // Index pour les notes en dessous de C4
let nextIndex = 2;  // Index suivant pour les notes de C4 à C6

for (let octave = 0; octave <= 8; octave++) {
    for (let note of notes) {
        let noteWithOctave = `${note}${octave}`;
        let noteVal = noteValue(note, octave);

        if (noteVal < valueC4) {
            noteToNumberMapping[noteWithOctave] = 1;
        } else if (noteVal >= valueC4 && noteVal <= valueC6) {
            noteToNumberMapping[noteWithOctave] = nextIndex++;
        } else if (noteVal > valueC6) {
            noteToNumberMapping[noteWithOctave] = nextIndex; // Utiliser le même index pour toutes les notes au-dessus de C6
        }
    }
    if (noteValue("B", octave) > valueC6) break; // Sortir de la boucle si on dépasse C6
}

// Vérifiez le mapping
console.log(noteToNumberMapping);
