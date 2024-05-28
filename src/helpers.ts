const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const CREDENTIALS_PATH = "./svc_acc.json";

import { google, sheets_v4 } from "googleapis";
import { readFileSync } from "fs";

async function readSheet(
  sheets: sheets_v4.Sheets,
  sheetId: string,
  range: string,
  hasHeader: boolean,
) {
  // Read values using a defined range
  let values = (
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    })
  ).data.values;
  if (hasHeader) values?.shift();
  return values;
}

async function authSheets() {
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));

  // Create a JWT client
  const authClient = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    SCOPES,
  );

  // Authorize the client
  await authClient.authorize();

  // Create a Google Sheets API client
  return google.sheets({ version: "v4", auth: authClient });
}

export function similarity(s1: string, s2: string) {
  function editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (
    (longerLength - editDistance(longer, shorter)) /
    parseFloat(longerLength.toString())
  );
}
export { readSheet, authSheets };
