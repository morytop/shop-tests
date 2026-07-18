import type { JsonObject, JsonValue } from './normalize-spec.ts';

/**
 * Known doc/behaviour mismatches, applied to the normalized spec before schema
 * generation so the contract suite stays green while the docs are wrong. One
 * entry per mismatch, each citing its `PRODUCT_EXPLORATION.md` write-up.
 *
 * Policy (see `.ai-docs/api-contract-validation-plan.md`): a contract failure
 * is triaged like any other doc/behaviour mismatch — record it in
 * `PRODUCT_EXPLORATION.md`, then either it's an API regression (leave the test
 * red / report it) or a stale doc (add an entry here). The helpers throw when
 * an entry no longer applies, so a docs fix surfaces as a loud generation
 * failure telling you to delete the entry.
 */
interface SchemaDeviation {
  /** `PRODUCT_EXPLORATION.md` citation + one-line summary of the mismatch. */
  reason: string;
  apply: (spec: JsonObject) => void;
}

const schemaDeviations: SchemaDeviation[] = [
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): brand objects nested in product ' +
      'responses omit `slug`, though the doc reuses the full BrandResponse ref',
    apply: (spec): void => dropFromRequired(spec, 'BrandResponse', ['slug']),
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): category objects nested in ' +
      'product responses never carry `sub_categories`, and serve `slug`/' +
      '`parent_id` only on some endpoints (list/single vs search/related)',
    apply: (spec): void =>
      dropFromRequired(spec, 'CategoryResponse', [
        'slug',
        'parent_id',
        'sub_categories',
      ]),
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): `GET /products/{id}` returns an ' +
      'undocumented `specs` key',
    apply: (spec): void =>
      // Item shape deliberately unconstrained ({}): the key is undocumented, so
      // there is no doc contract for its rows to validate against.
      addOptionalProperty(spec, 'ProductResponse', 'specs', {
        type: 'array',
        items: {},
      }),
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): `GET /carts/{id}` serves ' +
      '`additional_discount_percentage`, `lat`, `lng` and the `cart_items` ' +
      "rows beyond the bare `{id}` the docs' CartResponse declares",
    apply: (spec): void => {
      // Shapes deliberately unconstrained ({}): the keys are undocumented, so
      // there is no doc contract for their values to validate against.
      addOptionalProperty(
        spec,
        'CartResponse',
        'additional_discount_percentage',
        {},
      );
      addOptionalProperty(spec, 'CartResponse', 'lat', {});
      addOptionalProperty(spec, 'CartResponse', 'lng', {});
      addOptionalProperty(spec, 'CartResponse', 'cart_items', {
        type: 'array',
        items: {},
      });
    },
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): `POST /messages` answers with the ' +
      'stored message row, never the documented `{success: true}` ack — the ' +
      'response is repointed at the same ContactResponse refs the by-id read documents',
    apply: (spec): void =>
      replaceResponseSchema(
        spec,
        '/messages',
        'post',
        '200',
        'AddContactMessageResponse',
        {
          oneOf: [
            { $ref: '#/components/schemas/ContactResponse' },
            { $ref: '#/components/schemas/ContactResponseAuthenticated' },
          ],
        },
      ),
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): neither `GET /users/me` nor the ' +
      '`POST /users/register` 201 body serves `enabled`/`failed_login_attempts`, ' +
      'though the docs reuse the full UserResponse ref for both',
    apply: (spec): void =>
      dropFromRequired(spec, 'UserResponse', [
        'enabled',
        'failed_login_attempts',
      ]),
  },
  {
    // Must run after the shared UserResponse drop above — the fork inherits it.
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): the `POST /users/register` 201 ' +
      'body additionally omits `provider`/`totp_enabled` — the ref is forked ' +
      'for register alone so both fields stay required on `GET /users/me`, ' +
      'which does serve them',
    apply: (spec): void => {
      forkComponentSchema(spec, 'UserResponse', 'RegisteredUserResponse');
      dropFromRequired(spec, 'RegisteredUserResponse', [
        'provider',
        'totp_enabled',
      ]);
      repointResponseRef(
        spec,
        '/users/register',
        'post',
        '201',
        'RegisteredUserResponse',
      );
    },
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): the product embedded in ' +
      '`GET /favorites` rows carries no `brand`/`category` at all, though the ' +
      'docs nest the full ProductResponse ref — forked so both stay required ' +
      'on the product reads that do serve them',
    apply: (spec): void => {
      forkComponentSchema(spec, 'ProductResponse', 'FavoritedProductResponse');
      dropFromRequired(spec, 'FavoritedProductResponse', ['brand', 'category']);
      repointComponentPropertyRef(
        spec,
        'FavoriteWithProductResponse',
        'product',
        'FavoritedProductResponse',
      );
    },
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): invoice discount fields are null ' +
      'when no discount applies (`additional_discount_percentage` on the ' +
      'invoice, `discount_percentage`/`discounted_price` on its lines), though ' +
      'the docs declare them plain numbers',
    apply: (spec): void => {
      makePropertyNullable(
        spec,
        'InvoiceResponse',
        'additional_discount_percentage',
      );
      makePropertyNullable(spec, 'InvoiceLineResponse', 'discount_percentage');
      makePropertyNullable(spec, 'InvoiceLineResponse', 'discounted_price');
    },
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): `GET /invoices` rows serve ' +
      'neither `status_message` nor `created_at` though the docs require ' +
      'both, and `GET /invoices/{id}` serves `status_message` as null',
    apply: (spec): void => {
      dropFromRequired(spec, 'InvoiceResponse', [
        'status_message',
        'created_at',
      ]);
      makePropertyNullable(spec, 'InvoiceResponse', 'status_message');
    },
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): invoice reads carry undocumented ' +
      'keys — `payment` on the list rows, plus `eco_discount_percentage`/' +
      '`eco_discount_amount` on the by-id read',
    apply: (spec): void => {
      // Shapes deliberately unconstrained ({}): the keys are undocumented, so
      // there is no doc contract for their values to validate against.
      addOptionalProperty(spec, 'InvoiceResponse', 'payment', {});
      addOptionalProperty(
        spec,
        'InvoiceResponse',
        'eco_discount_percentage',
        {},
      );
      addOptionalProperty(spec, 'InvoiceResponse', 'eco_discount_amount', {});
    },
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): the product embedded in invoice ' +
      'lines omits `description`, `is_location_offer`, `is_rental`, `brand` ' +
      'and `category`, though the docs nest the full ProductResponse ref — ' +
      'forked so all five stay required on the reads that serve them. Its ' +
      '`product_image` is trimmed too, to `{by_name, by_url, id}`, on the ' +
      'by-id read only — the list rows embed the full image',
    apply: (spec): void => {
      forkComponentSchema(spec, 'ProductResponse', 'InvoicedProductResponse');
      dropFromRequired(spec, 'InvoicedProductResponse', [
        'description',
        'is_location_offer',
        'is_rental',
        'brand',
        'category',
      ]);
      repointComponentPropertyRef(
        spec,
        'InvoiceLineResponse',
        'product',
        'InvoicedProductResponse',
      );
      forkComponentSchema(
        spec,
        'ImageResponse',
        'InvoicedProductImageResponse',
      );
      dropFromRequired(spec, 'InvoicedProductImageResponse', [
        'source_name',
        'source_url',
        'file_name',
        'title',
      ]);
      repointComponentPropertyRef(
        spec,
        'InvoicedProductResponse',
        'product_image',
        'InvoicedProductImageResponse',
      );
    },
  },
  {
    reason:
      'PRODUCT_EXPLORATION.md §6 (REST API): `GET /products/{id}/related` rows ' +
      'omit `co2_rating` — the only product read that does, so the shared ' +
      'ProductResponse ref is forked for that endpoint alone rather than ' +
      'weakening the field everywhere',
    apply: (spec): void => {
      forkComponentSchema(spec, 'ProductResponse', 'RelatedProductResponse');
      dropFromRequired(spec, 'RelatedProductResponse', ['co2_rating']);
      repointResponseItemsRef(
        spec,
        '/products/{productId}/related',
        'get',
        'RelatedProductResponse',
      );
    },
  },
];

export function applySchemaDeviations(spec: JsonObject): void {
  for (const deviation of schemaDeviations) {
    deviation.apply(spec);
  }
}

/**
 * Makes documented-but-not-served properties optional. Note the component is
 * shared by every endpoint referencing it, so the property goes optional
 * everywhere it appears — the price of not forking the shared ref.
 */
function dropFromRequired(
  spec: JsonObject,
  schemaName: string,
  properties: string[],
): void {
  const schema = componentSchema(spec, schemaName);
  const required = schema.required;
  if (!Array.isArray(required)) {
    throw new Error(
      `Deviation for ${schemaName} ran before required-ification — apply the overlay last.`,
    );
  }
  for (const property of properties) {
    if (!required.includes(property)) {
      throw new Error(
        `Stale deviation: '${property}' is not required on ${schemaName} — the docs may have been fixed; delete the entry.`,
      );
    }
  }
  schema.required = required.filter(
    (property) => !properties.includes(property as string),
  );
}

/** Adds a property the live API serves but the docs omit — optional, never required. */
function addOptionalProperty(
  spec: JsonObject,
  schemaName: string,
  property: string,
  propertySchema: JsonObject,
): void {
  const schema = componentSchema(spec, schemaName);
  const properties = schema.properties;
  if (typeof properties !== 'object' || properties === null) {
    throw new Error(`${schemaName} declares no properties object.`);
  }
  if (property in properties) {
    throw new Error(
      `Stale deviation: '${property}' is now documented on ${schemaName} — delete the entry.`,
    );
  }
  (properties as JsonObject)[property] = propertySchema;
}

/**
 * Registers a copy of a component schema under a new name, so a single
 * endpoint's deviation can be expressed without loosening the shared ref for
 * every other endpoint that references it.
 */
function forkComponentSchema(
  spec: JsonObject,
  sourceName: string,
  forkName: string,
): void {
  const source = componentSchema(spec, sourceName);
  const components = spec.components;
  const schemas = isJsonObject(components) ? components.schemas : undefined;
  if (!isJsonObject(schemas)) {
    throw new Error('The spec declares no components.schemas object.');
  }
  if (forkName in schemas) {
    throw new Error(
      `Stale deviation: component schema '${forkName}' now exists in the spec — rename the fork or delete the entry.`,
    );
  }
  schemas[forkName] = structuredClone(source);
}

/**
 * Swaps out a documented response schema wholesale, for the rare case where the
 * live endpoint answers with a different shape entirely. The expected title of
 * the documented inline schema is the staleness guard: when the docs stop
 * declaring it, the entry throws instead of silently replacing a fixed schema.
 */
function replaceResponseSchema(
  spec: JsonObject,
  pathKey: string,
  method: string,
  status: string,
  expectedTitle: string,
  replacement: JsonObject,
): void {
  const context = `${method.toUpperCase()} ${pathKey} ${status} response`;
  const content = getObject(
    getObject(getObject(spec, 'paths'), pathKey, method),
    'responses',
    status,
    'content',
    'application/json',
  );
  const schema = content.schema;
  if (!isJsonObject(schema) || schema.title !== expectedTitle) {
    throw new Error(
      `Stale deviation: ${context} no longer declares the '${expectedTitle}' schema — the docs may have been fixed; delete the entry.`,
    );
  }
  content.schema = replacement;
}

/** Widens a documented plain-typed property to also accept null. */
function makePropertyNullable(
  spec: JsonObject,
  schemaName: string,
  property: string,
): void {
  const propertySchema = getObject(
    componentSchema(spec, schemaName),
    'properties',
    property,
  );
  if (typeof propertySchema.type !== 'string') {
    throw new Error(
      `Stale deviation: ${schemaName}.${property} declares no plain type — the docs may already allow null; delete the entry.`,
    );
  }
  propertySchema.type = [propertySchema.type, 'null'];
}

/** Repoints a component schema property's `$ref` at a forked component schema. */
function repointComponentPropertyRef(
  spec: JsonObject,
  schemaName: string,
  property: string,
  forkName: string,
): void {
  const propertySchema = getObject(
    componentSchema(spec, schemaName),
    'properties',
    property,
  );
  if (typeof propertySchema.$ref !== 'string') {
    throw new Error(
      `Stale deviation: ${schemaName}.${property} carries no $ref.`,
    );
  }
  propertySchema.$ref = `#/components/schemas/${forkName}`;
}

/** Repoints a JSON response's direct schema `$ref` at a forked component schema. */
function repointResponseRef(
  spec: JsonObject,
  pathKey: string,
  method: string,
  status: string,
  forkName: string,
): void {
  const context = `${method.toUpperCase()} ${pathKey} ${status} response`;
  const schema = getObject(
    getObject(getObject(spec, 'paths'), pathKey, method),
    'responses',
    status,
    'content',
    'application/json',
    'schema',
  );
  if (typeof schema.$ref !== 'string') {
    throw new Error(`Stale deviation: ${context} carries no direct $ref.`);
  }
  schema.$ref = `#/components/schemas/${forkName}`;
}

/** Repoints a JSON response's array-items `$ref` at a forked component schema. */
function repointResponseItemsRef(
  spec: JsonObject,
  pathKey: string,
  method: string,
  forkName: string,
): void {
  const context = `${method.toUpperCase()} ${pathKey} 200 response`;
  const operation = getObject(getObject(spec, 'paths'), pathKey, method);
  const items = getObject(
    operation,
    'responses',
    '200',
    'content',
    'application/json',
    'schema',
    'items',
  );
  if (typeof items.$ref !== 'string') {
    throw new Error(`Stale deviation: ${context} items carry no $ref.`);
  }
  items.$ref = `#/components/schemas/${forkName}`;
}

/** Walks nested objects, throwing a stale-deviation error on a missing step. */
function getObject(node: JsonObject, ...keys: string[]): JsonObject {
  let current: JsonObject = node;
  for (const key of keys) {
    const next: JsonValue | undefined = current[key];
    if (!isJsonObject(next)) {
      throw new Error(
        `Stale deviation: expected an object at '${key}' (of path ${keys.join('.')}) in the spec.`,
      );
    }
    current = next;
  }
  return current;
}

function componentSchema(spec: JsonObject, schemaName: string): JsonObject {
  const components = spec.components;
  const schemas = isJsonObject(components) ? components.schemas : undefined;
  const schema = isJsonObject(schemas) ? schemas[schemaName] : undefined;
  if (!isJsonObject(schema)) {
    throw new Error(
      `Stale deviation: component schema '${schemaName}' no longer exists in the spec.`,
    );
  }
  return schema;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
