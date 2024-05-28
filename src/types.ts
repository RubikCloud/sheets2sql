export type TableRepresentation = {
  sheet_id: number;
  sheet_name: string;
  model_name: string | undefined;
  fields: {
    in_model:
      | {
          name: string;
          type: FieldTypes;
        }
      | undefined;
    in_sheets: {
      index: number;
      header_name: string;
    };
  }[];
  data: {
    row_n: number;
    fields: {};
  }[];
  data_raw: any[][];
  data_errors: { sheet: string; row: number; error: string }[];
};

export enum FieldTypes {
  BigInt = "BigInt",
  Boolean = "Boolean",
  Bytes = "Bytes",
  DateTime = "DateTime",
  Decimal = "Decimal",
  Float = "Float",
  Int = "Int",
  JSON = "JSON",
  String = "String",
}
