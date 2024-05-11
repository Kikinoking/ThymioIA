import React, { useEffect, useState } from 'react';
import thymioSvg from '../assets/ThymioSVG.svg';  // Assurez-vous que ce chemin est correct
import thymioSvgTraits from '../assets/ThymioSVG_modif.svg';
type ThymioSVGProps = {
  captors: number[];  // Un tableau représentant l'état des capteurs (0 ou 1)
  style?: React.CSSProperties;
  showTraits: boolean;
};

const ThymioSVG: React.FC<ThymioSVGProps> = ({ captors, style = {}, showTraits }) => {
  const [svgContent, setSvgContent] = useState('');

  useEffect(() => {

    const svgFile = showTraits ? thymioSvgTraits : thymioSvg;

    fetch(svgFile)
      .then(response => response.text())
      .then(data => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(data, "image/svg+xml");

        // Ajustez la taille du SVG ici si nécessaire
        const svgElement = svgDoc.querySelector('svg');
        if (svgElement) {
          Object.keys(style).forEach(key => {
            svgElement.style[key] = style[key];
          });
        }

        // Manipulation des calques en fonction des capteurs
        captors.forEach((status, index) => {
          const layer = svgDoc.getElementById(`Layer ${index}`);  // Assurez-vous que l'indexation est correcte
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
  }, [captors, style, showTraits]);

  return (
    <div dangerouslySetInnerHTML={{ __html: svgContent }} style={style} />
  );
};

export default ThymioSVG;
