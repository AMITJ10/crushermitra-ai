# Master Data API

Base path: `/api/v1/master-data`.

All endpoints require a valid signed session cookie. Tenant and plant scope are
resolved from the authenticated session; clients must not send or override
`organisation_id`.

## Resources

- `customers`
- `customerSites`
- `suppliers`
- `products`
- `productUnits`
- `productPrices`
- `vehicles`
- `drivers`
- `machines`
- `storageLocations`
- `shifts`

## List

`GET /api/v1/master-data/:resource`

Query parameters:

- `page`: 1-based page number.
- `pageSize`: bounded to 100.
- `search`: server-side search term.
- `status`: `active`, `inactive` or `all`; defaults to `active`.
- `plantId`: server-side plant filter for plant-scoped resources.
- `type`: category/type filter where supported.
- `sort`: `code`, `name`, `createdAt` or default updated order.
- `export=csv`: generates a server-side CSV export after `master_data.export`
  permission is checked.

## Create

`POST /api/v1/master-data/:resource`

Returns `201` on success. Payloads are validated by resource-specific schemas in
`packages/validation`. Server-side repository code applies tenant scope and
audits the operation.

## Update

`PATCH /api/v1/master-data/:resource/:id`

Returns `200` on success. Referenced records must belong to the same
organisation, and plant-scoped records must be inside the authenticated user's
allowed plant list.

## Deactivate

`DELETE /api/v1/master-data/:resource/:id`

This is a soft deactivation. Records are marked inactive and retain
deactivation metadata. Referenced master records are not hard-deleted.

## Audit History

`GET /api/v1/master-data/:resource/:id?history=audit`

Requires `audit.view`.

## Error Shape

Errors use a structured response:

```json
{
  "error": {
    "code": "CUSTOMER_CODE_EXISTS",
    "message": "Customer code already exists.",
    "field": "code",
    "requestId": "req_..."
  }
}
```

Duplicate business-key conflicts return `409`. Validation failures return `400`.
Invalid references return `422`. Missing records return `404`. Unauthenticated
requests return `401`, and permission failures return `403`.
