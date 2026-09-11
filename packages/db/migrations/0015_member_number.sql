-- The member number (specs/concepts/member-number.md): which place a supporter
-- holds in the order people started backing this organization.
--
-- Everything else the product says about a member moves: hearts accumulate,
-- the validity turns over, the standing flips. The number is the one fact that
-- never does, so it is stored rather than derived: derived from anything at
-- all, it would shift the day a payment was refunded or a row was erased, and
-- a number that can move is not worth having.
--
-- Unique per organization, and NULL until the member's first payment is
-- captured. SQLite counts NULLs as distinct, so the index allows any number of
-- supporters still waiting for their first payment to land.
ALTER TABLE supporting_members ADD COLUMN member_number INTEGER;

CREATE UNIQUE INDEX supporting_members_member_number ON supporting_members (org_id, member_number);

-- Everyone who had already paid when numbers arrived gets theirs now, in the
-- order they first paid, so an organization's earliest supporters hold its
-- lowest numbers instead of the count starting at whoever pays next. Members
-- with no completed period are left out on purpose: the number is earned by
-- paying, and theirs is handed out when their payment lands.
UPDATE supporting_members
   SET member_number = (
     SELECT ranked.place
       FROM (
         SELECT m.id AS id,
                ROW_NUMBER() OVER (
                  PARTITION BY m.org_id
                  ORDER BY paid.first_paid, m.created_at, m.id
                ) AS place
           FROM supporting_members AS m
           JOIN (
             SELECT member_id, MIN(created_at) AS first_paid
               FROM memberships
              GROUP BY member_id
           ) AS paid ON paid.member_id = m.id
       ) AS ranked
      WHERE ranked.id = supporting_members.id
   )
 WHERE member_number IS NULL
   AND EXISTS (SELECT 1 FROM memberships WHERE memberships.member_id = supporting_members.id);
