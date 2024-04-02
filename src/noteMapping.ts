
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const noteToNumberMapping: { [key: string]: number } = {};


let noteNumber = 1;

for (let octave = 0; octave <= 8; octave++) {
  for (let note of notes) {
    let noteWithOctave = `${note}${octave}`;
    let frequency = 440 * Math.pow(2, (noteNumber - 49) / 12);
    if (frequency > 2000) break;
    if (frequency >= 200 && frequency <= 2000) {
      noteToNumberMapping[noteWithOctave] = noteNumber;
    }
    noteNumber++;
  }
}