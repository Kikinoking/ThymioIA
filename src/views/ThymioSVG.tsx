import  { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import thymioSvg from '../assets/ThymioSVG.svg';  // Assurez-vous que ce chemin est correct
import thymioSvgTraits from '../assets/ThymioSVG_modif.svg';
type ThymioSVGProps = {
  captors: number[];  // Un tableau représentant l'état des capteurs (0 ou 1)
  style?: React.CSSProperties;
  showTraits: boolean;
  onRectCoordinates: (coordinates: { x: number, y: number }[]) => void;
  onLoaded?: () => void;
};

const ThymioSVG: React.FC<ThymioSVGProps> = ({ captors, style = {}, showTraits, onRectCoordinates , onLoaded}) => {
  const [svgContent, setSvgContent] = useState('');
  const svgRef = useRef<HTMLDivElement>(null);
  

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

        if (onLoaded) {
          onLoaded();
        }
      });
  }, [captors, style, showTraits, onLoaded]);

  useEffect(() => {
    if (onRectCoordinates && svgRef.current) { // Vérifier si onRectCoordinates est fourni avant de calculer les coordonnées
      const rects = svgRef.current.querySelectorAll('g[id^="Group_"] > rect');
      const rectCoordinates = Array.from(rects).map(rect => {
        const box = rect.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      });
      onRectCoordinates(rectCoordinates);
    }
  }, [svgContent, onRectCoordinates]);

  return (
    <div ref={svgRef} dangerouslySetInnerHTML={{ __html: svgContent }} style={style} />
  );
};

export default ThymioSVG;
