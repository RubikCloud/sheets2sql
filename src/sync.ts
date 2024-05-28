// npm run sync
// 1. leer sheet por sheet - pasar a JSON
// 2. leer schema prisma - intentar inferir hoja de sheet y luego column -> field
// 3. guardar JSON del mapping. Pedir a usuario que lo modifique
import { Prisma } from "@prisma/client";
import { authSheets } from "./helpers";
import { TableRepresentation, FieldTypes } from "./types";
import { SPREADSHEET_ID, TMP_STEP1_FILE } from "./definitions";
import { existsSync, writeFileSync, readFileSync } from "fs";
import prompts from "prompts";
import { similarity } from "./helpers";

const sync = async () => {
  const sheetsClient = await authSheets();
  const models = Prisma.dmmf.datamodel.models;

  // paso 1
  // 1. leer sheet por sheet - pasar a JSON
  let tables: TableRepresentation[] = [];

  if (!existsSync(TMP_STEP1_FILE)) {
    const sheetMetadata = await sheetsClient.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    for (const sheet of sheetMetadata.data.sheets!) {
      const sheetId = sheet.properties!.sheetId!;
      const sheetName = sheet.properties!.title!;
      if (sheetName.includes("ignore")) {
        continue;
      }
      const sheetData = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!1:1`,
      });

      console.log(`Trayendo hoja ${sheetName}`);
      await new Promise((r) => setTimeout(r, 200));

      if (!sheetData.data.values) {
        throw new Error("No se puede leer data del sheet " + sheetName);
      }

      const table: TableRepresentation = {
        model_name: undefined,
        sheet_name: sheetName,
        sheet_id: sheetId,
        data: [],
        data_errors: [],
        data_raw: [],
        fields: sheetData.data.values[0].map((e, i) => ({
          in_sheets: {
            header_name: e,
            index: i,
          },
          in_model: undefined,
        })),
      };
      tables.push(table);
    }
    writeFileSync(TMP_STEP1_FILE, JSON.stringify(tables, null, 2));
  } else {
    tables = JSON.parse(readFileSync(TMP_STEP1_FILE).toString());
  }

  // paso 2. leer schema prisma - modelo por modelo, intentar inferir hoja de sheet ; field por field, intentar inferir columna de sheets
  const models_not_found_in_sheets: string[] = [];
  for (const model of models) {
    // el modelo existe en algun sheet?
    const { relatedTable, found_by_similarity } = getTableFromModelName(
      tables,
      model,
    );

    if (!relatedTable) {
      models_not_found_in_sheets.push(model.name);
      continue;
    }

    const tableRef = tables.find((e) => e.sheet_id === relatedTable.sheet_id)!;

    // si las encontré por similitud, promptear si es en efecto ese Model.
    // si lo es, actualizarlo en tables.
    // si no lo es, no encontramos match.
    if (found_by_similarity) {
      const r = await prompts({
        type: "confirm",
        name: "indeed",
        message: `Modelo ${model.name} -> ${relatedTable.sheet_name} ?`,
      });
      if (!r.indeed) {
        models_not_found_in_sheets.push(model.name);
        continue;
      }
    }
    console.log(`Modelo ${model.name} -> ${relatedTable.sheet_name}: OK`);
    tableRef.model_name = model.name;

    // si, existe. coincide algun header_name del sheets con algun field del modelo?
    const { modifiedTableFields, not_found_fields } = infereFields(
      relatedTable,
      model,
    );

    // actualizar los fields que coincidan
    tableRef.fields = modifiedTableFields;

    if (not_found_fields.length) {
      console.error(
        `No se pudieron inferir los siguientes campos de la tabla ${relatedTable.model_name} desde el sheets: ${not_found_fields}`,
      );
    }
  }

  if (models_not_found_in_sheets.length) {
    console.error(
      `No se pudieron inferir los siguientes modelos desde las hojas del sheets:\n` +
        `  -- ${models_not_found_in_sheets.join("\n -- ")}`,
    );
  }

  writeFileSync(TMP_STEP1_FILE, JSON.stringify(tables, null, 2));
};

const infereFields = (
  relatedTable: TableRepresentation,
  model: Prisma.DMMF.Model,
): {
  not_found_fields: string[];
  modifiedTableFields: TableRepresentation["fields"];
} => {
  const not_found: string[] = [];

  for (const tableField of relatedTable.fields) {
    const relatedFieldInModel = model.fields.find(
      (e) =>
        e.name === tableField.in_sheets.header_name ||
        e.name === tableField.in_model?.name,
    );

    if (!relatedFieldInModel) {
      not_found.push(tableField.in_sheets.header_name);
      continue;
    }

    tableField.in_model = {
      name: relatedFieldInModel.name,
      type:
        tableField.in_model?.type || (relatedFieldInModel.type as FieldTypes),
    };
  }
  return {
    not_found_fields: not_found,
    modifiedTableFields: relatedTable.fields,
  };
};

const getTableFromModelName = (
  tables: TableRepresentation[],
  model: Prisma.DMMF.Model,
): {
  relatedTable: TableRepresentation | undefined;
  found_by_similarity: boolean;
} => {
  let relatedTable: TableRepresentation | undefined;
  relatedTable = tables.find(
    (e) =>
      e.model_name === model.name ||
      e.sheet_name.toLowerCase().replaceAll("_", "") ===
        model.name.toLowerCase(),
  );
  if (relatedTable) return { relatedTable, found_by_similarity: false };

  relatedTable = tables.find((e) => similarity(e.sheet_name, model.name) > 0.7);
  if (relatedTable) return { relatedTable, found_by_similarity: true };

  return { relatedTable: undefined, found_by_similarity: false };
};

sync();
