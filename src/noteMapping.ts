/**
 * noteMapping.ts 
 * 
 * Provides utility functions and mappings to convert musical notes into their corresponding numeric values.
 * This module includes:
 * - An array of all musical notes within an octave.
 * - A function to convert a note and its octave into a unique numerical identifier.
 * - A mapping of each note from multiple octaves to a numerical value based on their sequence.
 * The numerical value is calculated based on the note's position and the octave.
 * Includes notes from C0 up to C8, assigning a unique or same index to notes from C4 to above C6.
 * Anyway we rarely use notes not between C4 or C6 in this app.
 */

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteToNumberMapping: { [key: string]: number } = {};


/**
 * Convert note to numerical value
 * @param {string} note - The musical note (e.g., 'C', 'D#', 'F', etc.).
 * @param {number} octave - The octave number of the note.
 * @returns {number} The numeric value of the note, calculated as `(octave * 12) + noteIndex`.
 */
function noteValue(note: string, octave: number): number {
  const noteIndex = notes.indexOf(note);
  return octave * 12 + noteIndex; // 12 notes par octave
}

const valueC4 = noteValue('C', 4);
const valueC6 = noteValue('C', 6);
const valueC8 = noteValue('C', 8);

let nextIndex = 2; // Index for notes from C4 à C6
let highNoteIndex = 0; // Index for notes above C6

for (let octave = 0; octave <= 8; octave++) {
  for (let note of notes) {
    let noteWithOctave = `${note}${octave}`;
    let noteVal = noteValue(note, octave);

    if (noteVal < valueC4) {
      noteToNumberMapping[noteWithOctave] = 1;
    } else if (noteVal >= valueC4 && noteVal <= valueC6) {
      noteToNumberMapping[noteWithOctave] = nextIndex++;
    } else if (noteVal > valueC6) {
      if (highNoteIndex === 0) {  //If not defined yet
        highNoteIndex = nextIndex++; // Uses next index
      }
      noteToNumberMapping[noteWithOctave] = highNoteIndex; 
    }
  }
  if (noteValue('B', octave) > valueC8) break; // Stop if above c8
}

