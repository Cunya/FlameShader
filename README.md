# Flame Shader done by Windsurf and Claude 3.5

A dynamic flame shader visualization project built with Three.js that applies customizable flame effects to windsurfing images. The project uses WebGL shaders to create realistic flame animations that can be masked to follow specific image shapes.

## Features

- Real-time flame effect shader implementation
- Image masking for precise flame effect placement
- Interactive GUI controls for customizing flame parameters
- Responsive design that adapts to window resizing
- Support for multiple images with individual flame settings
- Alpha channel support for transparent backgrounds

## Technologies Used

- Three.js (v0.157.0) - 3D graphics library
- Vite - Build tool and development server
- GLSL - Shader programming language
- JavaScript (ES6+)

## Project Structure

```
├── main.js              # Main application entry point
├── shaders/             # GLSL shader files
│   ├── flame.vert       # Vertex shader
│   ├── flame.frag       # Fragment shader
├── public/              # Public assets
├── Flame-images/        # Image assets for flame effects
├── index.html          # HTML entry point
└── vite.config.js      # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to the local development server (usually `http://localhost:5173`)

## Usage

The application provides an interactive interface where you can:
- View flame effects applied to windsurfing images
- Adjust flame parameters using the GUI controls
- Switch between different images
- Customize flame behavior and appearance

### GUI Controls

The interface includes controls for:
- Flame intensity
- Color settings
- Animation speed
- Effect parameters
- Visibility toggles

## Development

The project uses Vite for development and building. Available scripts:

- `npm start` - Start development server
- `npm run build` - Build for production

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Three.js community for the 3D graphics framework
- GLSL shader programming resources and community
- Contributors and maintainers of the dependencies 