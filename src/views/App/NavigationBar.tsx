import * as React from 'react';
import './NavigationBar.css'; // Ensure this CSS file exists
import { useTranslation } from 'react-i18next';

// Define the props interface including className
interface NavigationBarProps {
  currentState: string;
  stopExecutionAndReset: () => void;
  setCurrentState: React.Dispatch<React.SetStateAction<string>>;
  visitedStates: { [key: string]: boolean };
  setMode: React.Dispatch<React.SetStateAction<string>>;
  user: any; // Define a more specific type if available
  controledRobot: string;
  className?: string; // Optional className prop
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentState,
  stopExecutionAndReset,
  setCurrentState,
  visitedStates,
  setMode,
  user,
  controledRobot,
  className, // Destructure the className prop
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

  const getColor = (state: string) => {
    const originalStateKey = state.replace('state_', ''); 
    if (originalStateKey === currentState) {
      return stateColors.current; 
    } else if (visitedStates[originalStateKey]) {
      return stateColors.past; 
    }
    return stateColors.future; 
  };

  const handleButtonClick = (stateKey: string) => {
    setCurrentState(stateKey.replace('state_', ''));
    setMode('TRAIN');
    if (user && controledRobot) {
      user.emitMotorEvent(controledRobot, 'STOP');
    }
  };

  return (
    <div className={`navigation-bar ${className}`}> {/* Use className here */}
      {stateKeys.map((stateKey, index) => (
        <React.Fragment key={stateKey}>
          {index > 0 && <div className="separator" />}
          <button
            style={{ backgroundColor: getColor(stateKey) }}
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
