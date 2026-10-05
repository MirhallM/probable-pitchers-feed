/*
 * Google Apps Script for Real Sports App Tracker: Team Cards
 * Functions:
 *  1. submitTeamPerformance(): logs daily team performance into Team Card Game Log, applies rarity multiplier
 *  2. submitNewTeam(): adds a new team card entry into Team Card Database and autofills formulas dynamically using helper functions
 */

/**
 * Helper to get column index by header name
 */
function col(header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dbSheet = ss.getSheetByName('Team Card Database');
  var headers = dbSheet.getRange(1, 1, 1, dbSheet.getLastColumn()).getValues()[0];
  return headers.indexOf(header) + 1;
}

/**
 * Helper to get column letter by header name
 */
function letter(header) {
  var index = col(header);
  var letter = '';
  while (index > 0) {
    var mod = (index - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    index = Math.floor((index - mod) / 26);
  }
  return letter;
}

/**
 * Logs a team's daily performance based on Data Entry fields:
 * B7: Date, C7: Team Name, D7: Runs Scored, E7: Runs Allowed
 * Computes base Rax earned, applies rarity multiplier, and logs to Game Log
 */
function submitTeamPerformance() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var input = ss.getSheetByName('Data Entry');
  var logSheet = ss.getSheetByName('Team Card Game Log');
  var dbSheet = ss.getSheetByName('Team Card Database');

  // Read input
  var date = input.getRange('B7').getValue();
  var teamName = input.getRange('C7').getValue();
  var runsScored = input.getRange('D7').getValue();
  var runsAllowed = input.getRange('E7').getValue();

  if (!date || !teamName || runsScored === '' || runsAllowed === '') {
    SpreadsheetApp.getUi().alert('Please fill in all team performance fields before submitting.');
    return;
  }

  // Calculate base Rax
  var baseRax = runsScored > runsAllowed ? runsScored + ((runsScored - runsAllowed) * 5) : runsScored;

  // Find team's rarity in Team Card Database
  var data = dbSheet.getDataRange().getValues();
  var headers = data[0];
  var teamCol = headers.indexOf('Team Name');
  var rarityCol = headers.indexOf('Card Rarity');
  var rarity = 'General';
  for (var i = 1; i < data.length; i++) {
    if (data[i][teamCol] === teamName) {
      rarity = data[i][rarityCol] || 'General';
      break;
    }
  }

  // Map rarity to multiplier
  var multMap = {
    'General': 1.0,
    'Common': 1.2,
    'Uncommon': 1.4,
    'Rare': 1.6,
    'Epic': 2.0,
    'Legendary': 2.5,
    'Mystic': 4.0,
    'Iconic': 6.0
  };
  var mult = multMap[rarity] || 1.0;

  // Compute final Rax
  var totalRax = Math.round(baseRax * mult);

  // Append to Game Log
  var nextRow = logSheet.getLastRow() + 1;
  logSheet.getRange(nextRow, 1).setValue(date);
  logSheet.getRange(nextRow, 2).setValue(teamName);
  logSheet.getRange(nextRow, 3).setValue(totalRax);

  // Clear input
  input.getRange('B7:E7').clearContent();
  SpreadsheetApp.getUi().alert('Team performance logged successfully!');
}

/**
 * Adds a new team card entry based on Data Entry fields:
 * K2: Date Acquired, K3: Team Name
 * Appends a new row in Team Card Database and autofills formulas using helper functions.
 */
function submitNewTeam() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var input = ss.getSheetByName('Data Entry');
  var dbSheet = ss.getSheetByName('Team Card Database');

  var dateAcquired = input.getRange('K2').getValue();
  var teamName = input.getRange('K3').getValue();
  if (!dateAcquired || !teamName) {
    SpreadsheetApp.getUi().alert('Please fill in both Date Acquired and Team Name before adding.');
    return;
  }

  var nextRow = dbSheet.getLastRow() + 1;
  dbSheet.getRange(nextRow, col('Data Acquired')).setValue(dateAcquired);
  dbSheet.getRange(nextRow, col('Team Name')).setValue(teamName);

  // Autofill formulas by header
  var r = nextRow;
  dbSheet.getRange(r, col('Card Rarity')).setFormula(
    `=IF(B${r}="","",IF(D${r}>=10140,"Iconic",
    IF(D${r}>=4140,"Mystic",
    IF(D${r}>=1140,"Legendary",
    IF(D${r}>=540,"Epic",
    IF(D${r}>=240,"Rare",
    IF(D${r}>=90,"Uncommon",
    IF(D${r}>=30,"Common","General"))))))))`);

  dbSheet.getRange(r, col('Total PPts')).setFormula(
    `=SUMIF('Player Card Database'!D:D,B${r},'Player Card Database'!E:E)`);

  dbSheet.getRange(r, col('PPts till Upgrade')).setFormula(
    `=IF(B${r}="","",
      IF(D${r}>=10140,"MAXED OUT",
      IF(D${r}<30,30-D${r},
      IF(D${r}<90,90-D${r},
      IF(D${r}<240,240-D${r},
      IF(D${r}<540,540-D${r},
      IF(D${r}<1140,1140-D${r},
      IF(D${r}<4140,4140-D${r},
      IF(D${r}<10140,10140-D${r},"")))))))))`);

  dbSheet.getRange(r, col('Total Rax Earned')).setFormula(
    `=IF(B${r}<>"",SUMIF('Team Card Game Log'!B:B,B${r},'Team Card Game Log'!C:C),"")`);

  dbSheet.getRange(r, col("Rax 'til Cap")).setFormula(
    `=IF(B${r}="","",IF(C${r}="Iconic","No Limit",
      VLOOKUP(C${r},{ 
        {"General",800};
        {"Common",1500};
        {"Uncommon",2500};
        {"Rare",4000};
        {"Epic",6000};
        {"Legendary",12000};
        {"Mystic",24000} },2,FALSE)-F${r}))`);

  input.getRange('K2:K3').clearContent();
  SpreadsheetApp.getUi().alert('New team card added successfully!');
}


function generateRaxProjections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName("Player Card Database");
  const projSheetName = "Rax Projections";
  const today = new Date();
  const numDays = 10; // Change for longer projections

  const data = dbSheet.getDataRange().getValues();
  const headers = data[0];

  const nameIdx = headers.indexOf("Player Name");
  const posIdx = headers.indexOf("Position");
  const baseRaxRAIdx = headers.indexOf("Base Rax RA");
  const rarityIdx = headers.indexOf("Card Rarity");

  // Define rarity multipliers
  const rarityMultipliers = {
    "General": 1.0,
    "Common": 1.2,
    "Uncommon": 1.4,
    "Rare": 1.6,
    "Epic": 2.0,
    "Legendary": 2.5,
    "Mystic": 4.0,
    "Iconic": 6.0
  };

  let adjustedProjections = [];

  for (let i = 1; i < data.length; i++) {
    const name = data[i][nameIdx];
    const position = data[i][posIdx];
    const baseRA = data[i][baseRaxRAIdx];
    const rarity = data[i][rarityIdx];

    if (name && typeof baseRA === "number" && baseRA > 0 && rarity in rarityMultipliers) {
      let adjustedRA = baseRA * rarityMultipliers[rarity];
      if (position === "Pitcher") {
        adjustedRA /= 5; // Normalize for pitcher frequency
      }
      adjustedProjections.push(adjustedRA);
    }
  }

  const dailyProjectedRax = adjustedProjections.reduce((sum, val) => sum + val, 0);

  // Create or reset the projection sheet
  let projSheet = ss.getSheetByName(projSheetName);
  if (projSheet) ss.deleteSheet(projSheet);
  projSheet = ss.insertSheet(projSheetName);

  projSheet.getRange("A1").setValue("Date");
  projSheet.getRange("B1").setValue("Projected Cumulative Rax");

  let cumulativeRax = 0;
  for (let i = 0; i < numDays; i++) {
    const projDate = new Date(today);
    projDate.setDate(today.getDate() + i);

    cumulativeRax += dailyProjectedRax;
    projSheet.getRange(i + 2, 1).setValue(projDate);
    projSheet.getRange(i + 2, 2).setValue(Math.round(cumulativeRax));
  }

  projSheet.autoResizeColumns(1, 2);
}



function generateVelocityCharts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const trackerSheet = ss.getSheetByName("Daily Performance Tracker");
  const chartSheetName = "Velocity Charts";
  const helperSheetName = "Velocity Chart Helper";

  // Get raw data: Date | Player | Rax
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const dateIdx = headers.indexOf("Date");
  const nameIdx = headers.indexOf("Player Name");
  const raxIdx = headers.indexOf("Rax Earned");

  // Group by player
  const playerMap = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const player = row[nameIdx]?.trim();
    const rax = row[raxIdx];
    const rawDate = row[dateIdx];
    if (!player || rawDate === "" || typeof rax !== "number") continue;

    if (!playerMap[player]) playerMap[player] = [];
    playerMap[player].push([new Date(rawDate), rax]);
  }

  // Create or reset the chart sheet
  let chartSheet = ss.getSheetByName(chartSheetName);
  if (chartSheet) ss.deleteSheet(chartSheet);
  chartSheet = ss.insertSheet(chartSheetName);

  // Create or reset the helper sheet
  let helperSheet = ss.getSheetByName(helperSheetName);
  if (helperSheet) ss.deleteSheet(helperSheet);
  helperSheet = ss.insertSheet(helperSheetName);

  let chartStartRow = 1;
  let helperStartRow = 1;

  Object.entries(playerMap).forEach(([player, entries]) => {
    entries.sort((a, b) => a[0] - b[0]);
    const formatted = entries.map(([date, rax]) => [date, rax]);
    if (formatted.length === 0) return;

    // Write data to helper sheet
    helperSheet.getRange(helperStartRow, 1).setValue("Date");
    helperSheet.getRange(helperStartRow, 2).setValue(player + " Velocity");
    helperSheet.getRange(helperStartRow + 1, 1, formatted.length, 2).setValues(formatted);

    // Calculate Y-axis max
    const maxRax = Math.max(...formatted.map(d => d[1]));
    const yMax = maxRax + 10;

    // Chart configuration using helper sheet's range
    const chart = chartSheet.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(helperSheet.getRange(helperStartRow, 1, formatted.length + 1, 2))
      .setPosition(chartStartRow, 4, 0, 0)
      .setOption("title", player + " - Rax Velocity")
      .setOption("hAxis", {
        title: "Date",
        slantedText: true,
        slantedTextAngle: 45
      })
      .setOption("vAxis", {
        title: "Rax Earned",
        viewWindow: {
          min: 0,
          max: yMax
        }
      })
      .setOption("legend", { position: "none" })
      .build();

    chartSheet.insertChart(chart);

    // Advance to next row blocks
    chartStartRow += Math.max(formatted.length + 15, 20);
    helperStartRow += formatted.length + 5;
  });

  // Hide the helper sheet to keep everything clean
  helperSheet.hideSheet();
}


function submitDailyPerformance() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Daily Performance Tracker');
  var inputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Entry'); // or where your input panel is
  
  // Get the data from the input panel
  var date = inputSheet.getRange('B3').getValue();         // Date in B3
  var playerName = inputSheet.getRange('C3').getValue();   // Player Name in C3
  var baseRax = inputSheet.getRange('D3').getValue();      // Base Rax in D3  
  var raxEarned = inputSheet.getRange('E3').getValue();    // Rax Earned in E3

  if (!date || !playerName) {
    SpreadsheetApp.getUi().alert("Please fill in all fields before submitting.");
    return;
  }
  
  // Find the next empty row in Daily Performance Tracker
  var lastRow = sheet.getLastRow() + 1;
  
  // Set the values in the Daily Performance Tracker sheet
  sheet.getRange(lastRow, 1).setValue(date);        // Date
  sheet.getRange(lastRow, 2).setValue(playerName);  // Player Name
  sheet.getRange(lastRow, 3).setValue(raxEarned);   // Rax Earned
  sheet.getRange(lastRow, 4).setValue(baseRax);     // Base Rax
  
  // Clear the input fields after submitting
//  inputSheet.getRange('B3').setValue('');
  inputSheet.getRange('C3').setValue('');
  inputSheet.getRange('D3').setValue('');
  inputSheet.getRange('E3').setValue('');

  SpreadsheetApp.getUi().alert("Performance successfully logged!");
}

function submitPlay() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Plays Tracker");
  
  // Get input values from cells H3, H4, H5, H6
  var playerName = ss.getRange("C11").getValue();
  var dateOfCard = ss.getRange("C12").getValue();
  var performancePoints = ss.getRange("C13").getValue();
  var cardRarity = ss.getRange("C14").getValue();

  // Validate that all fields are filled
  if (!playerName || !dateOfCard || !performancePoints || !cardRarity) {
    SpreadsheetApp.getUi().alert("Please fill in all fields before submitting.");
    return;
  }
  
  // Find the first empty row in column A within rows 2 to 1000
  var dataRange = sheet.getRange("A2:A1000");
  var dataValues = dataRange.getValues();
  var nextRow = 0;
  for (var i = 0; i < dataValues.length; i++) {
    if (dataValues[i][0] === "") {
      nextRow = i + 2; // Adding 2 because our data starts at row 2
      break;
    }
  }
  
  // If no empty row is found in the range, alert the user
  if (nextRow === 0) {
    SpreadsheetApp.getUi().alert("No empty row available in the Plays Tracker range (A2:A1000).");
    return;
  }
  
  // Insert data into the identified next empty row
  sheet.getRange(nextRow, 1).setValue(playerName);
  sheet.getRange(nextRow, 2).setValue(dateOfCard);
  sheet.getRange(nextRow, 3).setValue(performancePoints);
  sheet.getRange(nextRow, 4).setValue(cardRarity);
  sheet.getRange(nextRow, 5).setFormula(`=IF(ISNUMBER(MATCH(A${nextRow}, 'Player Card Database'!B:B, 0)), "✅", "")`);
  
  // Clear input fields (cells H3:H6)
  ss.getRange("C11:C14").clearContent();
  
  SpreadsheetApp.getUi().alert("Play successfully added!");
}

function appendPlayerCard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName("Player Card Database");
  const inputSheet = ss.getSheetByName("Data Entry");

  const date = inputSheet.getRange("H2").getValue();
  const playerName = inputSheet.getRange("H3").getValue();
  const position = inputSheet.getRange("H4").getValue();
  const team = inputSheet.getRange("H5").getValue();

  if (!date || !playerName || !position || !team) {
    SpreadsheetApp.getUi().alert("Please fill out all input cells (H2:H5) before submitting.");
    return;
  }

  const headers = dbSheet.getRange(1, 1, 1, dbSheet.getLastColumn()).getValues()[0];
  const headerMap = headers.reduce((acc, header, i) => {
    acc[header.trim()] = i + 1;
    return acc;
  }, {});

  const colLetterMap = Object.fromEntries(
    Object.entries(headerMap).map(([key, colNum]) => [key, String.fromCharCode(64 + colNum)])
  );

  const lastRow = dbSheet.getLastRow();
  const targetRow = lastRow + 1;

  const col = (name) => headerMap[name];
  const letter = (name) => colLetterMap[name];

  dbSheet.getRange(targetRow, col("Date Bought")).setValue(date);
  dbSheet.getRange(targetRow, col("Player Name")).setValue(playerName);
  dbSheet.getRange(targetRow, col("Position")).setValue(position);
  dbSheet.getRange(targetRow, col("Team")).setValue(team);

  dbSheet.getRange(targetRow, col("PPts")).setFormula(`=IF(${letter("Player Name")}${targetRow}="", "", SUMPRODUCT(ABS('Plays Tracker'!$C$2:$C$999) * ('Plays Tracker'!$A$2:$A$999 = ${letter("Player Name")}${targetRow})))`);

  dbSheet.getRange(targetRow, col("Card Rarity")).setFormula(`=IF(${letter("Date Bought")}${targetRow}="", "", 
    IF(${letter("PPts")}${targetRow}>=3380,"Iconic",
    IF(${letter("PPts")}${targetRow}>=1380,"Mystic",
    IF(${letter("PPts")}${targetRow}>=380,"Legendary",
    IF(${letter("PPts")}${targetRow}>=180,"Epic",
    IF(${letter("PPts")}${targetRow}>=80,"Rare",
    IF(${letter("PPts")}${targetRow}>=30,"Uncommon",
    IF(${letter("PPts")}${targetRow}>=10,"Common","General"))))))))`);

  dbSheet.getRange(targetRow, col("PPts till Upgrade")).setFormula(`=IF(${letter("Date Bought")}${targetRow}="", "", 
    IF(${letter("PPts")}${targetRow}>=3380, "MAXED OUT",
    IF(${letter("PPts")}${targetRow}<10, 10-${letter("PPts")}${targetRow},
    IF(${letter("PPts")}${targetRow}<30, 30-${letter("PPts")}${targetRow},
    IF(${letter("PPts")}${targetRow}<80, 80-${letter("PPts")}${targetRow},
    IF(${letter("PPts")}${targetRow}<180, 180-${letter("PPts")}${targetRow},
    IF(${letter("PPts")}${targetRow}<380, 380-${letter("PPts")}${targetRow},
    IF(${letter("PPts")}${targetRow}<1380, 1380-${letter("PPts")}${targetRow},
    IF(${letter("PPts")}${targetRow}<3380, 3380-${letter("PPts")}${targetRow}, "")))))))))`);

  dbSheet.getRange(targetRow, col("Base Rax Earned")).setFormula(`=IF(${letter("Date Bought")}${targetRow}<>"", SUMIF('Daily Performance Tracker'!B:B, ${letter("Player Name")}${targetRow}, 'Daily Performance Tracker'!D:D), "")`);

  dbSheet.getRange(targetRow, col("Rax Earnings")).setFormula(`=IF(${letter("Date Bought")}${targetRow}<>"", SUMIF('Daily Performance Tracker'!B:B, ${letter("Player Name")}${targetRow}, 'Daily Performance Tracker'!C:C), "")`);

  dbSheet.getRange(targetRow, col("Rax Until Cap")).setFormula(`=IF(${letter("Date Bought")}${targetRow}="", "", 
    IF(${letter("Card Rarity")}${targetRow}="Iconic", "No Limit", 
    VLOOKUP(${letter("Card Rarity")}${targetRow}, {
      {"General", 200}; 
      {"Common", 500}; 
      {"Uncommon", 1000}; 
      {"Rare", 2200}; 
      {"Epic", 4500}; 
      {"Legendary", 9000}; 
      {"Mystic", 18000}
    }, 2, FALSE) - ${letter("Rax Earnings")}${targetRow}))`);

  dbSheet.getRange(targetRow, col("Rax per Day")).setFormula(`=IF(OR(ISBLANK(${letter("Date Bought")}${targetRow}), ISBLANK(${letter("Rax Earnings")}${targetRow})), "", ${letter("Rax Earnings")}${targetRow} / MAX(1, TODAY() - ${letter("Date Bought")}${targetRow}))`);

  dbSheet.getRange(targetRow, col("Games Played")).setFormula(`=IF(${letter("Date Bought")}${targetRow}="", "", COUNTIF('Daily Performance Tracker'!B:B, ${letter("Player Name")}${targetRow}))`);

  dbSheet.getRange(targetRow, col("Rax per Game")).setFormula(`=IF(${letter("Date Bought")}${targetRow}="", "", IF(${letter("Games Played")}${targetRow}>0, ${letter("Rax Earnings")}${targetRow}/${letter("Games Played")}${targetRow}, 0))`);

  dbSheet.getRange(targetRow, col("Base Rax RA")).setFormula(`=IF(${letter("Date Bought")}${targetRow}="","",
    IF(${letter("Position")}${targetRow}="Pitcher",
      AVERAGE(QUERY('Daily Performance Tracker'!A:D, "select D where B = '" & ${letter("Player Name")}${targetRow} & "' order by A desc limit 3", 0)),
      AVERAGE(QUERY('Daily Performance Tracker'!A:D, "select D where B = '" & ${letter("Player Name")}${targetRow} & "' order by A desc limit 6", 0))
    )
  )`);

  dbSheet.getRange(targetRow, col("Rolling Average")).setFormula(`=IF(${letter("Date Bought")}${targetRow}="","",
    IF(${letter("Position")}${targetRow}="Pitcher",
      AVERAGE(QUERY('Daily Performance Tracker'!A:C, "select C where B = '" & ${letter("Player Name")}${targetRow} & "' order by A desc limit 3", 0)),
      AVERAGE(QUERY('Daily Performance Tracker'!A:C, "select C where B = '" & ${letter("Player Name")}${targetRow} & "' order by A desc limit 6", 0))
    )
  )`);

  dbSheet.getRange(targetRow, col("Composite Score")).setFormula(
    `=IF(${letter("Date Bought")}${targetRow}="", "", 
      IF(OR(${letter("Card Rarity")}${targetRow}="Iconic", ${letter("Card Rarity")}${targetRow}=""), 
        "Maxed", 
        LET(
          raxLeft, ${letter("Rax Until Cap")}${targetRow},
          baseRA, ${letter("Base Rax RA")}${targetRow},
          rarityMult, SWITCH(${letter("Card Rarity")}${targetRow}, 
            "General", 1, 
            "Common", 1.2, 
            "Uncommon", 1.4, 
            "Rare", 1.6, 
            "Epic", 2.0, 
            "Legendary", 2.5, 
            "Mystic", 4.0, 
            "Iconic", 6.0, 
            1
          ),
          trueRA, baseRA * rarityMult,
          urgencyCap, 1.5 * trueRA,
          urgencyScore, IF(
            raxLeft <= urgencyCap, 
            1, 
            1 - (raxLeft - urgencyCap) / 
              (VLOOKUP(${letter("Card Rarity")}${targetRow}, 
                {"General",200;"Common",500;"Uncommon",1000;"Rare",2200;"Epic",4500;"Legendary",9000;"Mystic",18000}, 
                2, FALSE) - urgencyCap)
          ),
          performanceScore, IF(
            ${letter("Position")}${targetRow}="Pitcher", 
            MIN(trueRA / 35, 1), 
            MIN(trueRA / 16, 1)
          ),
          IF(${letter("Position")}${targetRow}="Pitcher", 
            0.7 * urgencyScore + 0.3 * performanceScore, 
            0.6 * urgencyScore + 0.4 * performanceScore
          )
        )
      )
    )`
  );

  dbSheet.getRange(targetRow, col("Upgrade Priority")).setFormula(`=IF(${letter("Date Bought")}${targetRow}="","", IF(${letter("Composite Score")}${targetRow}="Maxed", "No Upgrade Needed", IF(${letter("Composite Score")}${targetRow}>=0.75, "3. High", IF(${letter("Composite Score")}${targetRow}>=0.5, "2. Medium", "1. Low"))))`);

  dbSheet.getRange(targetRow, col("Est. Games to Cap")).setFormula(
    `=IF(AND(${letter("Rax Until Cap")}${targetRow}<>"", ${letter("Card Rarity")}${targetRow}<>""),` + 
    `\n  CEILING(` +
    `\n    ${letter("Rax Until Cap")}${targetRow} / (` +
    `\n      ${letter("Base Rax RA")}${targetRow} * SWITCH(` +
    `\n        ${letter("Card Rarity")}${targetRow},` +
    `\n        "General", 1,` +
    `\n        "Common", 1.2,` +
    `\n        "Uncommon", 1.4,` +
    `\n        "Rare", 1.6,` +
    `\n        "Epic", 2.0,` +
    `\n        "Legendary", 2.5,` +
    `\n        "Mystic", 4.0,` +
    `\n        "Iconic", 6.0,` +
    `\n        1` +
    `\n      )` +
    `\n    ), 1` +
    `\n  ),` +
    `\n  ""` +
    `\n)`
  );

  inputSheet.getRange("H2:H5").clearContent();
}
