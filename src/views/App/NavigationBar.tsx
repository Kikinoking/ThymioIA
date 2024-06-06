/**
 * NavigationBar.tsx
 *
 * Component to display a navigation bar with state-aware buttons.
 * Visually indicates the current, past, and future states of the app.
 * Uses color coding : Red for unvisited states, yellow for current state, green for past states
 */


import * as React from 'react';
import './NavigationBar.css';
import { useTranslation } from 'react-i18next';

interface NavigationBarProps {//All the props needed
  currentState: string;
  stopExecutionAndReset: () => void;
  setCurrentState: React.Dispatch<React.SetStateAction<string>>;
  visitedStates: { [key: string]: boolean };
  setMode: React.Dispatch<React.SetStateAction<string>>;
  user: any;
  controledRobot: string;
  className?: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentState,
  stopExecutionAndReset,
  setCurrentState,
  visitedStates,
  setMode,
  user,
  controledRobot,
  className, 
}) => {
  const { t } = useTranslation();

  const stateColors = {
    past: 'green',
    current: 'orange',
    future: 'red',
  };

  const stateKeys = [
    'state_Title',
    'state_ConsigneTraining',
    'state_PlayNote',
    'state_MapAction',
    'state_ConsigneTesting',
    'state_Testing',
    'state_CurrentModelTest',
  ];

  const getColor = (state: string) => { //get color for each button (key/state)
    const originalStateKey = state.replace('state_', ''); 
    if (originalStateKey === currentState) {
      return stateColors.current; 
    } else if (visitedStates[originalStateKey]) {
      return stateColors.past; 
    }
    return stateColors.future; 
  };

  const handleButtonClick = (stateKey: string) => { //stops motor when clicked 
    setCurrentState(stateKey.replace('state_', ''));
    setMode('TRAIN');
    if (user && controledRobot) {
      user.emitMotorEvent(controledRobot, 'STOP');
    }
  };

  const buttonWidth = `${90 / stateKeys.length}vw`; //computes button width

  return (
    <div className={`navigation-bar ${className}`}>
      {stateKeys.map((stateKey, index) => (
        <React.Fragment key={stateKey}>
          {index > 0 && <div className="separator" />}
          <button
            style={{ backgroundColor: getColor(stateKey), width: buttonWidth }} // applies the width computed
            onClick={() => handleButtonClick(stateKey)}
            className={`state-item ${getColor(stateKey)}`}
            disabled={!visitedStates[stateKey.replace('state_', '')]}
          >
            <div className="button-text">{t(stateKey)}</div>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default NavigationBar;
