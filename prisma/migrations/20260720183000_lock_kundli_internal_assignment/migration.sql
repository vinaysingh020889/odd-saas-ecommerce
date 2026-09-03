-- Keep the customer-selection enum value dormant until the public selection feature is built.
UPDATE "KundliPackage"
SET "practitionerSelectionMode" = 'INTERNAL_ASSIGNMENT'
WHERE "practitionerSelectionMode" = 'CUSTOMER_SELECTS_GURUJI';
