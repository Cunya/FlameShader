# Flame Shader done with Windsurf and Claude 3.5

A dynamic flame shader visualization project built with Three.js that applies customizable flame effects with images. The project was developed using Windsurf IDE and uses WebGL shaders to create realistic flame animations that can be masked to follow specific image shapes.

## Features

- Real-time flame effect shader implementation
- Image masking for precise flame effect placement
- Interactive GUI controls for customizing flame parameters
- Responsive design that adapts to window resizing
- Support for multiple images with individual flame settings
- Alpha channel support for transparent backgrounds

## Technologies Used

- Three.js (v0.157.0) - 3D graphics library
- Vite (v4.5.0) - Build tool and development server
- Express.js - Production server
- GLSL - Shader programming language
- JavaScript (ES6+)

## Project Structure

```
├── main.js              # Main application entry point
├── index.html          # HTML entry point
├── dev-index.html      # Development HTML entry point
├── server.js           # Express server for production
├── vite.config.js      # Vite configuration
├── shaders/            # GLSL shader files
│   ├── flame.vert      # Vertex shader
│   ├── flame.frag      # Fragment shader
├── assets/             # Project assets
├── docs/               # Documentation files
├── public/             # Public static assets
├── Flame-images/       # Image assets for flame effects
└── dist/               # Production build output
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
   npm run dev
   ```
4. Open your browser and navigate to the local development server (usually `http://localhost:5173`)

### GitHub Pages Deployment

This project is configured to be deployed to GitHub Pages from the main branch. The deployment is automated using GitHub Actions.

To deploy to GitHub Pages:

1. Push your changes to the main branch
2. GitHub Actions will automatically build and deploy the site to GitHub Pages using the `peaceiris/actions-gh-pages` action
3. Your site will be available at `https://[your-username].github.io/[repository-name]/`

Before the first deployment, make sure to:

1. Go to your repository on GitHub
2. Click on "Settings"
3. In the left sidebar, click on "Pages"
4. Under "Build and deployment", select "Deploy from a branch"
5. Select "gh-pages" branch and "/ (root)" folder
6. Click "Save"

If you want to build and deploy manually:

1. Build the project:
   ```bash
   npm run build
   ```
2. Copy the PNG files to the root directory:
   ```bash
   cp public/*.png .
   ```
3. Commit and push the changes to the gh-pages branch

## Usage

The application provides an interactive interface where you can:
- View flame effects applied to images
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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run serve` - Run production server

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Three.js community for the 3D graphics framework
- GLSL shader programming resources and community
- Contributors and maintainers of the dependencies 