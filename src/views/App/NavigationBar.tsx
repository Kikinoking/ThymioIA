import React from 'react';
import './NavigationBar.css'; // Ensure to create this CSS file
import { useTranslation } from 'react-i18next';

const NavigationBar = ({ currentState, setCurrentState }) => {
    const { t } = useTranslation();

    const stateColors = {
        past: 'green',
        current: 'orange',
        future: 'red'
    };

    // Map your state keys for translation purposes
    const stateKeys = [
        'state_Title',
        'state_ConsigneTraining',
        'state_PlayNote',
        "state_MapAction",
        "state_CurrentModelTrain",
        "state_ConsigneTesting",
        "state_Testing",
        "state_CurrentModelTest"
    ];

    // These are the keys from app.tsx STATES
    const STATES = {
        Title: 'Title',
        ConsigneTraining: 'ConsigneTraining',
        PlayNote: 'PlayNote',
        MapAction: 'MapAction',
        CurrentModelTrain: 'CurrentModelTrain',
        ConsigneTesting: 'ConsigneTesting',
        Testing: 'Testing',
        CurrentModelTest: 'CurrentModelTest'
    };

    const getColor = (stateKey) => {
        const currentIndex = stateKeys.indexOf(currentState);
        const stateIndex = stateKeys.indexOf(stateKey);

        if (stateIndex === currentIndex) {
            return stateColors.current; // Orange for the current state
        } else if (stateIndex < currentIndex) {
            return stateColors.past; // Green for past states
        }
        return stateColors.future; // Red for future states
    };

    return (
        <div className="navigation-bar">
            {stateKeys.map((stateKey, index) => (
                <React.Fragment key={stateKey}>
                    {index > 0 && <div className="separator" />}
                    <button
                        style={{ backgroundColor: getColor(stateKey) }} // Apply background color
                        onClick={() => setCurrentState(STATES[stateKey.replace('state_', '')])} // Use stateKeys for setState
                        className={`state-item ${getColor(stateKey)}`}
                    >
                        {t(stateKey)}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
};

export default NavigationBar;
