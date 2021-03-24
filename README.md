# a9v2

a9v2 — a web-based note-taking application, version 2

## Requirements

Python 3 and a modern browser (i.e., not IE <= 8)

## Setup

Run `server.py` either by double-clicking the icon or invoking through a terminal.

## Usage notes

* Notes should be created, renamed, and deleted manually (outside the web app).
* The title of the notes can be edited in the editor screen.

## Differences from [the previous version](https://github.com/ppasupat/a9)

* Uses the file system for organizing notes (instead of an index file).
* The directory and file names are used as identifiers instead of automatic indices. 
* Has two separate screens: note selector and editor.
* Uses vim key binding as default.
* Uses KaTeX for math rendering.
