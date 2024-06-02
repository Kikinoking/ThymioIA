interface Window {
    webkitAudioContext?: typeof AudioContext;
}
declare namespace JSX {
    interface IntrinsicElements {
        'l-momentum': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
            size?: string;
            speed?: string;
            color?: string;
        };
        'l-grid': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
            size?: string;
            speed?: string;
            color?: string;
        };
    }
}
