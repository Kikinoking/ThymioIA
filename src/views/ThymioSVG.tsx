import { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import thymioSvg from '../assets/ThymioSVG.svg'; 
import thymioSvgTraits from '../assets/ThymioSVG_modif.svg';
type ThymioSVGProps = {
  captors: number[]; // Array representing the status of the sensors (0 or 1)
  style?: React.CSSProperties;
  showTraits: boolean;
  onRectCoordinates?: (coordinates: { x: number; y: number }[]) => void;
  onLoaded?: () => void;
};

const ThymioSVG: React.FC<ThymioSVGProps> = ({ captors, style = {}, showTraits, onRectCoordinates, onLoaded }) => {
  const [svgContent, setSvgContent] = useState('');
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svgFile = showTraits ? thymioSvgTraits : thymioSvg;

    fetch(svgFile) //fetches the SVG because 2 svgs are possible. one with arrows (in currentModelTest), and one without (all other instances)
      .then(response => response.text())
      .then(data => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(data, 'image/svg+xml');

        
        const svgElement = svgDoc.querySelector('svg');
        if (svgElement) {
          Object.keys(style).forEach(key => {
            svgElement.style[key] = style[key];
          });
        }

        // Manipulates layers of svg as a function of sensors
        captors.forEach((status, index) => {
          const layer = svgDoc.getElementById(`Layer ${index}`); // indexation is handmade to correspond to layers
          if (layer) {
            layer.style.visibility = status ? 'visible' : 'hidden';
          }
        });

        // always display base layer
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
    if (onRectCoordinates && svgRef.current) {
      // computes coords of the svg
      const rects = svgRef.current.querySelectorAll('g[id^="Group_"] > rect');
      const rectCoordinates = Array.from(rects).map(rect => {
        const box = rect.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      });
      onRectCoordinates(rectCoordinates);
    }
  }, [svgContent, onRectCoordinates]);

  return <div ref={svgRef} dangerouslySetInnerHTML={{ __html: svgContent }} style={style} />;
};

export default ThymioSVG;
