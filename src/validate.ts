// npm run validate
// 1. descargar datos del sheets
// 2. guardarlos en campo DATA del JSON
// 3. fijarse si los datos de cada row corresponden con los tipos de cada columna/field
// 4. printear errores si los hay
import { readFileSync, writeFileSync } from "fs";
import { authSheets } from "./helpers";
import { TableRepresentation, FieldTypes } from "./types";
import {
  SPREADSHEET_ID,
  TMP_STEP1_FILE,
  TMP_DATASAVED_FILE,
  MIGRATION_ORDER,
} from "./definitions";
import { Prisma } from "@prisma/client";

const validate = async () => {
  const sheetsClient = await authSheets();

  const tables: TableRepresentation[] = JSON.parse(
    readFileSync(TMP_STEP1_FILE).toString(),
  );
  const models = Prisma.dmmf.datamodel.models;

  const not_in_models = MIGRATION_ORDER.filter(
    (e) => !models.find((m) => m.name === e),
  );

  if (not_in_models.length) {
    throw new Error(
      `Las siguientes entradas de MIGRATION_ORDER no existen en schema.prisma (o no fueron migrados): \n` +
        ` -- ${not_in_models.join("\n -- ")}`,
    );
  }

  const tablesWithErrors: string[] = [];

  for (const table of tables) {
    await new Promise((r) => setTimeout(r, 200));

    if (!table.model_name) {
      console.log(
        `Ignorando hoja ${table.sheet_name} porque no tiene modelo correspondiente.`,
      );
      continue;
    }
    const sheetData = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${table.sheet_name}`,
    });

    if (!sheetData.data.values) {
      throw new Error("No se puede leer data del sheet " + table.sheet_name);
    }
    const rows = sheetData.data.values;
    rows.shift();

    table.data_raw = rows;

    const mappedRows: TableRepresentation["data"] = [];
    const rowsWithErrors: TableRepresentation["data_errors"] = [];

    for (const [index, row] of rows.entries()) {
      try {
        mappedRows.push({
          row_n: index,
          fields: fieldsFromRow(row, table.fields),
        });
      } catch (e) {
        rowsWithErrors.push({
          sheet: table.sheet_name,
          row: index,
          error: String(e),
        });
      }
    }

    table.data = mappedRows;
    table.data_errors = rowsWithErrors;
    if (rowsWithErrors.length) tablesWithErrors.push(table.sheet_name);
  }
  if (tablesWithErrors.length)
    console.error(
      `Hay errores de validación en las siguientes hojas de sheets: \n` +
        ` -- ${tablesWithErrors.join("\n -- ")}. \n` +
        `Por favor, hacer ` +
        `los cambios pertinentes y volver a validar.`,
    );
  else {
    console.log(
      "Los datos de sheets fueron cargados y validados correctamente. Podés continuar al siguiente paso",
    );
  }
  writeFileSync(TMP_DATASAVED_FILE, JSON.stringify(tables, null, 2));
};

const fieldsFromRow = (
  row: any[],
  tableFields: TableRepresentation["fields"],
): Record<string, any> => {
  let outObj: Record<string, string | number | boolean | undefined> = {};
  for (let field of tableFields) {
    outObj[field.in_model!.name] = castType(
      field.in_model!.type,
      field.in_model!.name,
      row[field.in_sheets.index],
    );
  }

  return outObj;
};

const castType = (
  field_type: FieldTypes,
  field_name: string,
  value: any,
): string | number | boolean | undefined => {
  if (!value || value === "#N/A" || value === "N/A") {
    return undefined;
  }
  switch (field_type) {
    case "Float":
      if (Number.isNaN(parseFloat(value)))
        throw new Error(
          `Columna [${field_name}] - [${value}] no es tipo float.`,
        );
      return parseFloat(value);
    case "Int":
      if (Number.isNaN(parseInt(value)))
        throw new Error(`Columna [${field_name}] - [${value}] no es tipo int.`);
      return parseInt(value);
    case "BigInt":
      if (Number.isNaN(parseInt(value)))
        throw new Error(`Columna [${field_name}] - [${value}] no es tipo int.`);
      return parseInt(value);
    case "String":
      return String(value);
    case "Boolean":
      if (value.toLowerCase() !== "true" && value.toLowerCase() !== "false")
        throw new Error(
          `Columna [${field_name}] - [${value}] no es tipo boolean.`,
        );
      return value.toLowerCase() === "true";
    case "DateTime":
      // YYYY-MM-DD
      return new Date(Date.parse(value)).toISOString();
  }
  throw new Error(`Columna [${field_name}] - Tipo desconocido: ${field_type}`);
};

validate();
