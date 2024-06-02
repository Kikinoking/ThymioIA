const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteToNumberMapping: { [key: string]: number } = {};

// Converts note to index 
function noteValue(note, octave) {
  const noteIndex = notes.indexOf(note);
  return octave * 12 + noteIndex; // 12 notes par octave
}

const valueC4 = noteValue('C', 4);
const valueC6 = noteValue('C', 6);

let currentIndex = 1; // Index for notes below C4
let nextIndex = 2; // Index for notes from C4 to C6

for (let octave = 0; octave <= 8; octave++) {
  for (let note of notes) {
    let noteWithOctave = `${note}${octave}`;
    let noteVal = noteValue(note, octave);

    if (noteVal < valueC4) {
      noteToNumberMapping[noteWithOctave] = 1;
    } else if (noteVal >= valueC4 && noteVal <= valueC6) {
      noteToNumberMapping[noteWithOctave] = nextIndex++;
    } else if (noteVal > valueC6) {
      noteToNumberMapping[noteWithOctave] = nextIndex; // uses same index for notes higher than C6, just a choice by default.
    }
  }
  if (noteValue('B', octave) > valueC6) break; // break if above C6
}


