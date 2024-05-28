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

export { readSheet, authSheets };
