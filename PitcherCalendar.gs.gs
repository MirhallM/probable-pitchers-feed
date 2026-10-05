function fetchProbablePitchers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName("Player Card Database");
  const outputSheet = ss.getSheetByName("Pitcher Calendar");
  const url = "https://www.espn.com/fantasy/baseball/story/_/id/31165100/fantasy-baseball-forecaster-probable-starting-pitcher-projections-matchups-daily-weekly-leagues";

  // 1) Load tracked pitchers
  const dbData = dbSheet.getDataRange().getValues();
  const headers = dbData.shift();
  const dateIdx = headers.indexOf("Date Bought");
  const nameIdx = headers.indexOf("Player Name");
  const teamIdx = headers.indexOf("Team");
  const posIdx = headers.indexOf("Position");
  const tracked = dbData
    .filter(r => 
      (r[posIdx] + "").toLowerCase() === "pitcher" && r[dateIdx] !== ""
    )
    .map(r => ({ name: r[nameIdx], team: r[teamIdx] }));

  // 2) Prepare output sheet
  outputSheet.clearContents();
  outputSheet.appendRow(["Date", "Pitcher Name", "Team", "Opponent", "Home/Away"]);

  // 3) Fetch ESPN page
  const html = UrlFetchApp.fetch(url).getContentText();

  // 4) Extract the entire <tbody> block
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return;

  const tbodyHtml = tbodyMatch[1];

  // 5) Extract each <tr class="last">...</tr> block
  const tableBlocks = [...tbodyHtml.matchAll(/<tr class="last"[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
  if (!tableBlocks.length) return;

  // 6) Parse each block
  tableBlocks.forEach(blockHtml => {
    // Grab the first three <td> columns (skip 0, which is the logo)
    const tdMatches = [...blockHtml.matchAll(
      /<td[^>]*>([\s\S]*?)<\/td>/gi
    )].slice(1, 4).map(m => m[1]);

    // Split each by <br> and strip tags
    const dates     = tdMatches[0].split(/<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, "").trim());
    const opponents = tdMatches[1].split(/<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, "").trim());
    const pitchers  = tdMatches[2].split(/<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, "").trim());

    // For each day, see if any tracked pitcher appears
    dates.forEach((dt, i) => {
      const opp = opponents[i] || "";
      const homeAway = opp.startsWith("@") ? "Away" : "Home";
      const oppAbbrev = opp.replace("@", "").trim();
      const cell = pitchers[i] || "";

      tracked.forEach(p => {
        if (cell.includes(p.name)) {
          outputSheet.appendRow([dt, p.name, p.team, oppAbbrev, homeAway]);
        }
      });
    });
  });
  // 7) Sort by date (assumes header is in row 1)
  const lastRow = outputSheet.getLastRow();
  if (lastRow > 1) {
    outputSheet.getRange(2, 1, lastRow - 1, 5).sort({ column: 1, ascending: true });
  }
}
