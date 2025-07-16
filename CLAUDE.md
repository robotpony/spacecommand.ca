# CLAUDE.md

We are building a production-quality web game using Node.js/Express/NueJS for the backend and React for the frontend.

## Project Overview

This is a simulation runner called `statsim` that executes game simulations with multiple players. The project appears to be in early development with empty source directories.

## Standard Workflow

1. Think through the problem, read the codebase and relavent flies, and write a plan in `tasks/TODO.md`.
2. The plan should have a list of tasks that you check off as you complete them.
3. For new components, outline their design in a new design markdown file, named for the feature.
3. Before you begin working, check in with me and I will verify your plan and designs.
4. Then, begin working on the TODO items, marking them off as you go.
5. For every step, give an explanation of the changes made in a 1-2 line summary.
6. Make every task and code change as simple as possible. Every change should impact as little code as possible. Everything is about functional, clear, and simple code.
7. Finally, add a review section to the `tasks/TODO.md` file with a summary of the changes you made and any other relavent information.

## Architecture

- **Project Structure**: `src/` contains all project components and `bin/` contains all runnable files.
- **Configuration**: Node.js project, using Express for the RESTful APIs, and NueJS for the front-end website.
- **Documentation**: README.md contains usage examples and command structure, and DESIGN.md outlines the overall design rules.


## Development Notes

- This is a client/server web application built in Node with Express and NueJS
- The game is spread between various web pages and a simulated REPL terminal on the page that provides the player with a simulated ship experience
- The game uses limits of web, RESTful, and online gameplay to its advantage


## Phases

1. Explore the server and data structures and their RESTful interface, one by one. THe game will be split into components, data structures, and RESTful interfaces here.
2. Add a testing REPL client written in Node (terminal style interface)
3. Add a basic web REPL client written in Node for the browser
4. Play test and adjust game components and logic.
5. Play test and adjust game user experiences.
6. Build a website around the game.