import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("users"))) {
    await knex.schema.createTable("users", (table) => {
      table.uuid("user_id");
      table.string("email");
      table.unique(["email"]);
      table.primary(["user_id"]);
    });
    await knex.schema.createTable("user_consents", (table) => {
      table.uuid("user_id");
      table.enu("type", ["email_notification", "sms_notification"]);
      table.boolean("enabled");
      table.primary(["user_id", "type"]);
      table
        .foreign("user_id")
        .references("user_id")
        .inTable("users")
        .onDelete("CASCADE");
    });
    await knex.schema.createTable("user_consents_history", (table) => {
      table.uuid("user_id");
      table.enu("type", ["email_notification", "sms_notification"]);
      table.boolean("enabled");
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      table.index(["user_id", "updated_at"]);
      table
        .foreign("user_id")
        .references("user_id")
        .inTable("users")
        .onDelete("CASCADE");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("user_consents");
  await knex.schema.dropTableIfExists("user_consents_history");
}
