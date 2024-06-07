# ThymioIA React Application

This project is a React application that integrates with TensorFlow.js and Thymio robots for interactive AI learning and control. It uses Vite as a build tool for a fast development experience.

## Prerequisites

Before you begin, ensure you have installed the following on your system:

- Node.js (v18.18.2 or newer)
- yarn (1.22.21 or newer)

## Installation

To set up the project, follow these steps:

1. **Clone the repository:**

```bash
git clone https://github.com/Mobsya/ThymioIA.git
cd thymioia
```

2. **Install dependencies:**
using Yarn:

```bash
yarn
```

3. **Running the Development Server:**

To start the development server with hot module replacement (HMR) enabled:

with Yarn:

```bash
yarn dev
```

This will start the Vite development server and you can view your application at `http://localhost:3000`.

4. **Building for Production:**

To build the application for production deployment:

with Yarn:

```bash
yarn build
```

This will generate a `dist` folder in your project directory with optimized assets for deployment.

## Using ESLint and Prettier

The project is configured with ESLint for linting and Prettier for code formatting. You can run the linter with:

```bash
npm run lint
```

Or format your code with Prettier:

```bash
npm run format
```

## Committing Changes

This project uses Commitizen for structured commit messages. To make a commit:

```bash
yarn commit
```

Follow the prompts to complete your commit message.

## Additional Configuration

For further customization and advanced configurations, refer to the official Vite documentation at [https://vitejs.dev](https://vitejs.dev) and the React documentation at [https://reactjs.org](https://reactjs.org).

## Contributing

Contributions to this project are welcome! Please refer to the contributing guidelines for more details.

## Image and SVG Sources

This project utilizes several external images and SVG files. Below are the sources and attributions for these resources:

- **Help Icon**: Created by ByteDance (author), available at [SVGRepo](https://www.svgrepo.com/svg/387779/help).
- **Thymio SVG**: Originally extracted and reworked from the Mobile Robotics course by F. Mondada at EPFL. Access the original [Thymio Cheat Sheet PDF](https://moodle.epfl.ch/pluginfile.php/2706097/mod_resource/content/1/ThymioCheatSheet.pdf).
- **Settings Icon**: Created by Mary Akveo, available at [SVGRepo](https://www.svgrepo.com/svg/469755/settings).
- **Loading Animations**: Sourced from ldrs, available at [UIBall](https://uiball.com/ldrs/).
- **Treble Clef Icon**: Sourced from SVG Repo (author), available at [SVGRepo](https://www.svgrepo.com/svg/98269/treble-clef).
- **Flag Icons**: Provided by "flag-icon-css", a library offering SVG images of flags. More information and the library can be found at [Flag icon CSS](https://github.com/lipis/flag-icon-css).
## Deployment

The app has been deployed using Vercel : https://thymio-ia.vercel.app/
