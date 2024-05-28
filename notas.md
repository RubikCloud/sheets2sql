- Setear db url (cloud sql auth proxy)
- luego `npm run migrate:prisma`
- luego `npm run sync`
- si no encuentra modelo para alguna hoja, entrar a "tmp_sheets.json" y especificar "model_name": "NombreModelo" para la hoja. Por ejemplo:

  ```
      {
      "sheet_name": "building_amenities",
      // añadir
      "model_name": "BuildingAmenities",
      // end añadir
      "sheet_id": 275442748,
      "data": [],
      "data_errors": [],
      "data_raw": [],
      "fields": []
      }
  ```

  - volver a correr `npm run sync` para inferir los fields de esa hoja.

- luego `npm run validate`. Validar los datos que aparezcan en el JSON como data_errors
- luego `npm run generate`. Este paso genera el código para la migración de los modelos especificados en MIGRATION_ORDER (alt/definitions.ts). Antes de ingresar datos, borra los existentes en las tablas que va a migrar.
- luego correr el código en codegenerated.ts (`npx ts-node-transpile-only codegenerated.ts`)
- para checkear que los datos hayan sido subidos correctamente, se puede utilizar la función check_changes de generate.ts, o DBeaver.
