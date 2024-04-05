// ThymioSVG.tsx
import React, { useEffect, useState } from 'react';
import SVG from 'react-inlinesvg';
import thymioSvg from '../assets/ThymioSVG.svg';  // Assurez-vous que ce chemin est correct

type ThymioSVGProps = {
  captors: number[];  // Un tableau représentant l'état des capteurs (0 ou 1)
};

const ThymioSVG: React.FC<ThymioSVGProps> = ({ captors }) => {
  const [svgContent, setSvgContent] = useState('');

  // Preprocess SVG content based on captors
  useEffect(() => {
    fetch(thymioSvg)
      .then(response => response.text())
      .then(data => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(data, "image/svg+xml");
        
        // Ici, nous supposons que les ID des éléments dans le SVG sont 'Layer 0', 'Layer 1', etc.
        captors.forEach((status, index) => {
          const layer = svgDoc.getElementById(`Layer ${index}`);
          if (layer) {
            layer.style.visibility = status ? 'visible' : 'hidden';
          }
        });

        // Gardez la couche de base toujours visible
        const baseLayer = svgDoc.getElementById('Base');
        if (baseLayer) {
          baseLayer.style.visibility = 'visible';
        }

        setSvgContent(new XMLSerializer().serializeToString(svgDoc.documentElement));
      });
  }, [captors]);  // Ce useEffect réagira chaque fois que les capteurs changent

  return (
    <div dangerouslySetInnerHTML={{ __html: svgContent }} />
  );
};

export default ThymioSVG;
