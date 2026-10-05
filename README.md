# MLB Tracker Automation

Google Apps Script automation for a personal MLB player and team performance tracker built in Google Sheets.

This project started as a personal tool for tracking MLB players and teams in a baseball card-style progression system. As the tracker grew, repetitive calculations, performance logging, projections, pitcher scheduling, and data visualization were automated using Google Apps Script.

The goal was to turn a manually maintained spreadsheet into a system that could automatically process performance data and provide useful information for managing the tracker.

## Try the Tracker

The project includes a complete Google Sheets template containing the spreadsheet structure used by the scripts.

**[Copy the MLB Tracker template](https://docs.google.com/spreadsheets/d/1Kf-HcsvgN6VAtmBbptEx5IZORSSZQh5ruAy8xv2Lr68/copy)**

After making a copy, the Apps Script files in this repository can be added to the spreadsheet to reproduce the automation.

> **Note:** The template is provided as a starting point for exploring the project. The Apps Script code is designed around the specific sheet structure, columns, and ranges used by the tracker.

## Features

### Player Card Management

The automation can add new player cards to the database and automatically calculate:

- Player performance points (PPts)
- Card rarity
- Points remaining until the next upgrade
- Base Rax earned
- Total Rax earnings
- Rax earned per day
- Games played
- Rax earned per game
- Rolling performance averages
- Composite upgrade scores
- Upgrade priority
- Estimated games required to reach the card's Rax cap

Player calculations account for position. Pitchers and position players use different rolling averages and performance thresholds to reflect differences in how frequently they generate performance data.

### Team Card Management

Team cards have similar automated functionality, including:

- Team performance logging
- Card rarity calculation
- Performance point tracking
- Rax earnings
- Rax remaining until the card cap
- Automatic formula generation when new cards are added

Team performance is converted into base Rax and then adjusted according to the card's rarity multiplier.

### Daily Performance Logging

Player performances can be submitted through a data-entry interface rather than manually entering rows into the tracking database.

Each submission records:

- Date
- Player
- Base Rax
- Rax earned

The script then clears the input fields and confirms that the performance was successfully recorded.

### MLB Probable Pitcher Calendar

One of the main automation features is the **Pitcher Calendar**.

The script:

1. Reads the player database to identify tracked pitchers.
2. Retrieves probable starting pitcher information from ESPN.
3. Parses the relevant HTML table.
4. Searches the results for tracked pitchers.
5. Extracts the scheduled date, opponent, and home/away status.
6. Writes matching games to the Pitcher Calendar sheet.
7. Sorts the resulting schedule chronologically.

This allows the tracker to automatically identify upcoming games for pitchers that are actually being tracked, rather than requiring the schedule to be entered manually.

### Rax Projections

The tracker can generate short-term Rax projections based on the current player database.

The projection system:

- Applies card rarity multipliers.
- Calculates adjusted daily Rax.
- Accounts for pitcher frequency.
- Generates cumulative projections for upcoming days.

### Performance Velocity Charts

Historical player performance can be converted into automatically generated line charts.

The script groups performance data by player, creates helper data for the charts, generates a chart for each player, positions the charts automatically, and keeps the helper sheet hidden to avoid cluttering the tracker.

## Card Rarity System

The tracker uses progressively increasing rarity tiers:

| Rarity | Multiplier |
| --- | ---: |
| General | 1.0× |
| Common | 1.2× |
| Uncommon | 1.4× |
| Rare | 1.6× |
| Epic | 2.0× |
| Legendary | 2.5× |
| Mystic | 4.0× |
| Iconic | 6.0× |

These multipliers are used throughout the tracker to adjust player and team performance.

## How the System Works

The tracker is built around several interconnected Google Sheets.

The Apps Script functions act as the automation layer between the user-facing data-entry sheets and the underlying databases.

```text
                    Google Sheets
                         │
        ┌────────────────┴────────────────┐
        │                                 │
   Data Entry                       Player / Team
        │                              Databases
        ▼                                 │
Performance Trackers                      │
        │                                 │
        └──────────────┬──────────────────┘
                       ▼
                Automated Calculations
                       │
        ┌──────────────┼──────────────┐
        │              │              │
      Rax          Projections    Upgrade Priority
        │
        ▼
 Performance Charts
```

The pitcher calendar follows a separate workflow:

```text
Player Card Database
        │
        │ tracked pitchers
        ▼
ESPN probable
pitcher information
        │
        │ HTML parsing
        ▼
  Pitcher Calendar
        │
        ├── Date
        ├── Pitcher
        ├── Opponent
        └── Home/Away
```

## Technology

- **Google Sheets**
- **Google Apps Script**
- JavaScript
- Google Apps Script Spreadsheet Service
- Google Apps Script URL Fetch Service
- Google Sheets formulas and functions
- HTML parsing with regular expressions

## Repository Structure

```text
mlb-tracker-automation/
├── Code.gs
├── PitcherCalendar.gs
└── README.md
```

### `Code.gs`

Contains the primary tracker automation, including player and team management, performance logging, calculations, projections, and chart generation.

### `PitcherCalendar.gs`

Contains the automation responsible for retrieving and processing probable starting pitcher information and updating the Pitcher Calendar.

## Why I Built It

This project was created as a personal automation project rather than as a university assignment.

The tracker originally required a significant amount of manual data entry and repetitive calculation. Instead of continuing to maintain those processes manually, I used Google Apps Script to automate the parts of the workflow that could be reliably handled by code.

The project gradually evolved from a spreadsheet into a small data-processing and tracking system with automated calculations, projections, visualizations, and external data retrieval.

## Project Highlights

This project demonstrates several practical programming concepts outside of a traditional application framework:

- Automating repetitive workflows
- Working with structured spreadsheet data
- Creating and modifying spreadsheet ranges programmatically
- Generating formulas dynamically
- Processing and transforming data
- Maintaining state across multiple sheets
- Retrieving external web data
- Parsing HTML
- Filtering external data against an internal dataset
- Generating data visualizations programmatically
- Designing a system around a personal real-world workflow

## Notes

The scripts are designed around the structure of the original Google Sheets tracker. The spreadsheet template is provided separately so the project can be explored without requiring the original private tracker.

The probable-pitcher integration depends on the structure of the ESPN page at the time the script was written. Changes to the source page's HTML structure may require updates to the parser.

This repository contains the automation code used for the project. It does not contain private credentials, API keys, authentication information, or private user data.
