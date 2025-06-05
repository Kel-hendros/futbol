# Futbol Guess Game

This repository contains a simple game to guess the "Player of the Day". Google Analytics is used for anonymous usage tracking.

## Analytics Events

When a player is successfully guessed, the site emits the `jugador_encontrado` event. It includes the following parameters:

- `intentos`: number of attempts used to guess the player.
- `racha`: current streak of consecutive days guessing correctly.

