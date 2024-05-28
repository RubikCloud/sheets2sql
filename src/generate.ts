import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { TableRepresentation } from "./types";
import { TMP_DATASAVED_FILE, MIGRATION_ORDER } from "./definitions";
const migrate_native = async () => {
  const tables: TableRepresentation[] = JSON.parse(
    readFileSync(TMP_DATASAVED_FILE).toString(),
  );
  const prisma = new PrismaClient();
  for (const table of tables) {
    if (!table.model_name) continue;
    // @ts-ignore
    await prisma[table.model_name].createMany({
      data: table.data.map((e) => e.fields),
    });
  }
};

const migrate_codegen = async () => {
  const tables: TableRepresentation[] = orderAndFilterTables(
    JSON.parse(readFileSync(TMP_DATASAVED_FILE).toString()),
  );
  let globalSt =
    `import { PrismaClient } from "@prisma/client"; \n` +
    `import { MIGRATION_ORDER } from "./alt/definitions";` +
    `const createTables = async () => { \n` +
    `const prisma = new PrismaClient(); \n` +
    'for (const tableName of MIGRATION_ORDER) await prisma.$queryRawUnsafe(`Truncate "${tableName}" restart identity cascade;`);';
  for (const table of tables) {
    if (!table.model_name) continue;
    const model_name_in_client =
      table.model_name.charAt(0).toLowerCase() + table.model_name.slice(1);

    const fnSt =
      `// Tabla: ${table.model_name} \n` +
      // `await prisma.${model_name_in_client}.deleteMany(); \n` +
      `await prisma.${model_name_in_client}.createMany` +
      `({data: ${JSON.stringify(
        table.data.map((e) => e.fields),
        null,
        2,
      )}}); \n`;
    globalSt += fnSt;
  }
  globalSt += "}\n";
  globalSt += "createTables()";
  writeFileSync("./generated.ts", globalSt);
};

const check_changes = async () => {
  const tables: TableRepresentation[] = JSON.parse(
    readFileSync(TMP_DATASAVED_FILE).toString(),
  );
  const prisma = new PrismaClient();
  for (const table of tables) {
    if (!table.model_name) continue;
    const model_name_in_client =
      table.model_name.charAt(0).toLowerCase() + table.model_name.slice(1);
    console.log(
      model_name_in_client,
      // @ts-ignore
      await prisma[model_name_in_client].findMany({ take: 5 }),
    );
  }
};

const migrate_codegen_v2 = async () => {
  const tables: TableRepresentation[] = orderAndFilterTables(
    JSON.parse(readFileSync(TMP_DATASAVED_FILE).toString()),
  );
  let globalSt =
    `import { PrismaClient } from "@prisma/client"; \n` +
    `const createTables = async () => { \n` +
    `const tables\n` +
    `const prisma = new PrismaClient(); \n`;
  for (const table of tables) {
    if (!table.model_name) continue;
    const model_name_in_client =
      table.model_name.charAt(0).toLowerCase() + table.model_name.slice(1);

    const fnSt =
      `// Tabla: ${table.model_name} \n` +
      `await prisma.${model_name_in_client}.createMany` +
      `({data: ${JSON.stringify(
        table.data.map((e) => e.fields),
        null,
        2,
      )}}); \n`;
    globalSt += fnSt;
  }
  globalSt += "}\n";
  globalSt += "";
  writeFileSync("./generated.ts", globalSt);
};
const orderAndFilterTables = (tables: TableRepresentation[]) => {
  return tables
    .filter((item) => MIGRATION_ORDER.includes(item.model_name ?? ""))
    .sort((a, b) => {
      const aIndex = MIGRATION_ORDER.indexOf(a.model_name ?? "");
      const bIndex = MIGRATION_ORDER.indexOf(b.model_name ?? "");

      return aIndex - bIndex;
    });
};
// check_changes();
migrate_codegen();
