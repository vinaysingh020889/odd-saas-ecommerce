UPDATE "ChecklistTemplateItem" AS item
SET "defaultOwnerRole" = CASE
  WHEN item."title" = 'Confirm payment' THEN 'System'
  WHEN item."title" = 'Assign astrologer' THEN 'Operations'
  ELSE item."defaultOwnerRole"
END,
"description" = CASE
  WHEN item."title" = 'Confirm payment' THEN 'Payment confirmation is synchronized from the verified payment provider.'
  WHEN item."title" = 'Assign astrologer' THEN 'The system assigns an eligible available Guruji after Operations verifies the submitted details.'
  ELSE item."description"
END
FROM "ChecklistTemplate" AS template
WHERE item."templateId" = template."id"
  AND template."workType" = 'KUNDLI_ORDER'
  AND item."title" IN ('Confirm payment', 'Assign astrologer');

UPDATE "ChecklistInstanceItem" AS item
SET "assignedRole" = CASE
  WHEN item."title" = 'Confirm payment' THEN 'System'
  WHEN item."title" = 'Assign astrologer' THEN 'Operations'
  ELSE item."assignedRole"
END,
"assignedUserId" = NULL,
"description" = CASE
  WHEN item."title" = 'Confirm payment' THEN 'Payment confirmation is synchronized from the verified payment provider.'
  WHEN item."title" = 'Assign astrologer' THEN 'The system assigns an eligible available Guruji after Operations verifies the submitted details.'
  ELSE item."description"
END
FROM "ChecklistInstance" AS instance
WHERE item."checklistInstanceId" = instance."id"
  AND instance."relatedType" = 'KUNDLI_ORDER'
  AND item."title" IN ('Confirm payment', 'Assign astrologer');
