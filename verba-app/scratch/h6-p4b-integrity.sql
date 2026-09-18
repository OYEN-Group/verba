-- H6 Phase 4B — Integrity Verification SQL (corrected)
-- Run ID:          776bd813
-- Date:            2026-09-16
-- Target:          verba-silk.vercel.app
-- Supabase project: poaclxtaacguolfeefcd
--
-- ┌─────────────────────────────────────────────────────────────┐
-- │  PASTE THE ENTIRE SCRIPT AND CLICK RUN ONCE.                │
-- │  Do NOT split at semicolons or run checks individually.     │
-- │                                                             │
-- │  CTEs in PostgreSQL are scoped to a SINGLE SQL statement.   │
-- │  A semicolon ends the statement; all CTE names declared      │
-- │  before it become unknown to any subsequent statement.      │
-- │  The previous version had semicolons between checks, which  │
-- │  caused "relation does not exist" for checks 2–7.           │
-- │  This version is one statement: WITH … UNION ALL … ;        │
-- └─────────────────────────────────────────────────────────────┘
--
-- Expected result:
--   0 rows → all integrity checks passed, safe to run cleanup.
--   Any row → integrity violation; investigate before cleanup.
--
-- READ-ONLY. No INSERT, UPDATE, DELETE, DROP, ALTER, or CREATE.

WITH

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: FOUNDATION
-- 75 user → work → document assignments from scratch/h6-p4b-pool.json
-- ─────────────────────────────────────────────────────────────────────────────

expected_mapping (user_id, work_id, document_id) AS (
  VALUES
    ('aff5adf6-edc8-4744-9195-a0f4edb513a5'::uuid, 'abb7645d-7ffd-44d9-9f97-ba8c9f889525'::uuid, 'a18c97af-60a9-4915-9306-f240f9b32ef3'::uuid),
    ('2ff2511e-2af5-49d8-a89c-6f420afdc5ed'::uuid, '523dddb6-3e6d-4021-9e8b-f84f1ca91609'::uuid, '0b4b7d6b-f76d-4d5b-9e3b-7bfd598102b0'::uuid),
    ('ff43fd37-2fb2-41d9-aae7-45368d797dfc'::uuid, 'a6bb52bf-f745-4712-8ba3-adf0319d773d'::uuid, 'd2c58d23-3ce2-4bd6-a65c-724e5872e2dc'::uuid),
    ('a3048061-df90-41cc-904a-82e64692151c'::uuid, 'abf1353a-8053-40c7-af11-522977d203f7'::uuid, '4151b4da-5d09-4972-ab6b-454bf847eec6'::uuid),
    ('e1fb6043-6f55-44d8-96af-cd018890e2da'::uuid, '1fe8b721-7325-4e5d-9aef-34987bc10bbe'::uuid, 'e5969ca4-0f71-44aa-9d70-ead8bb7296dd'::uuid),
    ('f87c91e5-b539-4b75-a14d-c904e5f18e69'::uuid, '7ac30659-c5f6-4821-88ca-a7ad1edc8482'::uuid, '088a6d44-c779-4094-9fdf-d0c49921739e'::uuid),
    ('b1584aa6-e679-40a8-ac43-71134a00eafb'::uuid, '3c8c8d8d-28b4-4655-b5a3-5c5642bbd975'::uuid, '860dcc6d-8ea8-4828-854c-6c0e79ee4bf3'::uuid),
    ('274d4e70-90a9-45da-9869-d9bd8034938f'::uuid, '29f391bf-7352-46d9-9342-57570ef4ffdf'::uuid, 'faf01f40-ae8c-4f81-8bd4-1fb04a41720d'::uuid),
    ('777a0207-8983-4c50-89d5-930703dbca5a'::uuid, 'd6f71a2c-fa1f-4c8e-8996-c0066c6d7b53'::uuid, 'd90d86a4-e23f-4f8b-ae2b-bb7970ab1c65'::uuid),
    ('f863cd7b-ce3a-4577-85b2-c0414fdbeec5'::uuid, 'dd2ac8c3-7728-4a1e-83f9-5e222fcb6982'::uuid, '9bfda32a-a439-4c21-8b43-5765643eaf4c'::uuid),
    ('2d467068-0cc9-41bd-bf87-ffafc7e3d925'::uuid, '66f0c506-94a0-4b4a-8e74-4bafd9b75bd1'::uuid, '15f4017a-f21c-4ca7-b09b-a89f5e5dc3dd'::uuid),
    ('13cb05c3-912a-440a-ac5c-7e6c5a8a4815'::uuid, '2605d621-f82f-4105-8e1d-00a5545b4360'::uuid, 'd13dbdd8-530d-4278-a36e-1f74b1c3f5d9'::uuid),
    ('a8076f0c-db5e-4de9-857c-b66c9a004bac'::uuid, '80fbf1bb-b258-4c0a-81ea-bbabc91ca992'::uuid, 'e914cdfb-288a-4fa8-9767-30f06e60ed5e'::uuid),
    ('81ccd74d-6a1d-4333-bb7f-85faa5959a52'::uuid, '229d22e8-d6e5-4d1a-9e7d-83c6982db529'::uuid, 'eccd1946-3ec5-4ae8-b4d7-70497c7c1ad3'::uuid),
    ('54184ba4-6a89-4dc0-968e-dfa994897877'::uuid, '467a04e3-7f4c-4e7c-83e4-98d7bd930ac2'::uuid, '1253e928-d444-4a8b-a581-15c1b75a7d42'::uuid),
    ('6e0835aa-1de3-43df-b5a1-dd1e78ea3b1d'::uuid, '93d45dcb-fd67-4436-bd08-8c5080db0f31'::uuid, '3e608ccc-1660-4bcb-8d14-f64a89b3be1d'::uuid),
    ('a0995333-2612-4492-a860-257d45288b41'::uuid, '28162b27-687d-4a15-b7ce-f1cb2e3c307c'::uuid, '4dd49e3e-c6db-4fd7-85a0-a4dc9493cb52'::uuid),
    ('bc76c2d8-27dc-445f-8266-033b04209f9c'::uuid, '040e20fe-c126-40b3-abb8-2aea2a47a639'::uuid, 'fb2885a9-fc26-4eff-a5bc-c817a7318d3e'::uuid),
    ('5ddee2c8-bb3f-48f0-9163-cace94521039'::uuid, '59f8b50f-b5e8-4391-b1ec-fa566d855572'::uuid, 'c3537424-cf2f-41dc-aedb-bf4dc6df3dfe'::uuid),
    ('daf48e9e-1146-401a-a862-5b858a37c3b3'::uuid, '8075e6b8-7fb5-42e7-9eaa-d5c3fba8b0ab'::uuid, '0b3177fd-efa4-4985-9d90-77beb0a3eacd'::uuid),
    ('7e155b84-edf9-4532-bf4e-476440d659aa'::uuid, 'f86ecf47-55c2-461a-b274-eec5c271dc47'::uuid, 'fc74bb17-68c1-4994-a2d2-1b854f1d30f9'::uuid),
    ('55f0a981-0ec2-4aa3-8175-04214af94ec0'::uuid, '4e787835-1bb0-4820-b9c5-8f0fd84f7189'::uuid, 'f62d06e4-64c3-455a-83b6-76b0d341797c'::uuid),
    ('49bbf396-8e36-4a27-a3a3-e84e86f75dba'::uuid, '41bdd1fd-f453-482d-890c-1db30dad09db'::uuid, '148f39ed-2c78-4963-839c-b4fd6f965d78'::uuid),
    ('477e36f3-3be1-432a-969b-5b4dc944de17'::uuid, 'dd6e0a0c-4080-4a0d-a3ef-7703d1066ec4'::uuid, 'b0feb28a-0e7e-4e2a-9f56-7a49da94d6ec'::uuid),
    ('2c0cd4c5-6080-4610-8fad-b1626502bcb0'::uuid, '6cb292bd-1606-47fd-b0ef-66f83e0645fd'::uuid, 'a34916a1-be80-419a-a410-f342bedcf572'::uuid),
    ('7437d2c5-a297-42d5-ac3c-840b46610a03'::uuid, 'cff5503e-ec18-4ed5-b58e-d38f14540ae4'::uuid, '132efe44-8391-4af1-bc3f-ff4377d3abd1'::uuid),
    ('0ab0169a-0405-4b69-88ff-224b55a626ea'::uuid, '8a81754e-0337-43a2-88b1-d220b19ab70a'::uuid, '9c07459e-cdeb-44db-a4a9-3bff29defeea'::uuid),
    ('d21ef497-545c-427e-9292-04705be738a4'::uuid, '65909ab8-201d-40ce-8338-5db2a083fd9c'::uuid, '046c8c86-6f13-4f35-842d-6224b69843e2'::uuid),
    ('293f4e72-cdd2-4024-9b63-de6393586884'::uuid, '9878d4fd-3d97-4126-89d8-263105fea813'::uuid, 'f02cd7da-aae8-4f7e-9715-06d9326b4400'::uuid),
    ('7b77e050-9343-4b2f-a9f1-18fb408caa70'::uuid, 'd51aa164-ef89-4d75-9af1-0bca926aa936'::uuid, '1ba28ec3-2524-43db-b315-8bd9dac1b56b'::uuid),
    ('d1ec2e96-f77a-4ceb-8240-3ed9861b3bf6'::uuid, '1c16aad4-38da-48c8-a734-40c6017ec213'::uuid, '4dfceec4-03b2-4ec9-999d-b3480cdd32d9'::uuid),
    ('fef8dada-db1b-4056-be4c-4487e342e56a'::uuid, '18b277a0-a4da-4d73-bbb2-0c640662f2d6'::uuid, '57067bed-d0a9-4b3e-a2ad-7b12cdde6bb6'::uuid),
    ('80cb805b-8e2f-4ecf-8e71-6d0dbb3b2907'::uuid, '5efa74ce-7f85-4335-853f-8d2242969fe4'::uuid, 'b85ba1b5-d06f-4fb7-968f-827435b17a79'::uuid),
    ('c8362a77-efe9-4f26-a901-a43747c15236'::uuid, '658eeee2-27f3-4fd2-bb68-a0d826d67b2f'::uuid, '2005b991-9ad4-4d5a-832e-b46f7fa680c2'::uuid),
    ('cf9e50e6-38be-434e-b24e-444943242936'::uuid, 'f88cd3ad-7351-4936-83b4-a58dfa29175f'::uuid, 'e0e21105-afd2-40e0-b03e-f123666e8f1a'::uuid),
    ('349c9bf5-096f-4c8c-a6df-7e58cac6a582'::uuid, 'ab3831e9-6131-4db9-9f26-341208595739'::uuid, 'a126cabb-eae6-4585-aed6-a7436057cb3b'::uuid),
    ('dfd57585-9350-4f33-bd04-ea395b99c3e4'::uuid, '887978da-c584-4efc-b60c-f83e1615edbe'::uuid, '9c377456-7f02-442e-95e5-4a7a2135c836'::uuid),
    ('65d4ba74-ee8e-4c3b-969e-40e3cb5f3fca'::uuid, '10fa5463-edf2-4a82-b466-bf67476f058f'::uuid, 'd6bd49c3-324a-41b9-837b-0d0ec91ce13f'::uuid),
    ('817a2e08-4504-483a-ac02-a6c3d8530e67'::uuid, 'b7ff76cf-317b-4c2a-868c-ad91397b8262'::uuid, '3d9e9ef6-4b36-4d26-955e-6c55d958f7d7'::uuid),
    ('4351db44-af82-4dd5-a96a-0f1ae38b374b'::uuid, '7da81bc1-7f46-43f7-a1fa-8469dfd302b6'::uuid, 'ffd0d2ae-ca5a-4c6f-ae42-4ee9d1a9eb14'::uuid),
    ('40fff951-2591-4ee8-a3dc-cbd5477cba75'::uuid, '27996ea9-88fa-4e55-b377-15309f823b99'::uuid, '6c0c9bfa-0df5-4828-8bf3-1e2b8a0b70a8'::uuid),
    ('9f409ede-0b59-4266-890b-098ebbd26b44'::uuid, 'd9d19f28-6a71-4b7e-a5be-51abdd1b83b9'::uuid, 'cc434f83-9994-42ee-a120-706aa2ff64db'::uuid),
    ('e190f442-ce7d-42eb-ba8b-a254145fa39d'::uuid, '471560dd-0c7d-4f07-9dbd-10605c98e9f2'::uuid, '77a2605f-117b-4bcd-81b0-8a82af71e6cd'::uuid),
    ('316d880e-51ff-4296-8293-ba12ad9626f3'::uuid, '0ba65b6d-9e56-4609-8487-a011c65c1e77'::uuid, '492e0715-1acc-44c3-b5d3-9d62b4e52a4b'::uuid),
    ('bb88f9f3-d01f-4749-a3c2-a1a42a8f1093'::uuid, '673981e6-0a31-485a-bce0-90be649727fc'::uuid, 'd5129368-f895-455d-aec3-d9a0409544cb'::uuid),
    ('fd0f9bc2-cfbc-4dbe-aef4-f2aff53bce29'::uuid, 'b66edb05-960a-497d-ba88-fd2d19f64531'::uuid, 'cebc059b-90b2-4a60-abb4-d0606ea2ef50'::uuid),
    ('811e6e85-9f11-4071-9cc4-fa11f5e207bc'::uuid, '29f792c9-6fac-48b8-b859-ff4a84fe4eb6'::uuid, '1115f78f-ec8d-4546-a0aa-b6d0709bac4f'::uuid),
    ('efa5a096-2df2-4487-bb4f-866abe04de90'::uuid, '1278cb88-e5b0-4343-9091-77e1aa602328'::uuid, 'b49e575d-5839-468c-a701-9c34b040fc75'::uuid),
    ('864e0f87-3576-4dd7-b2ef-3e6bc43331ad'::uuid, '93219e3b-fc84-449e-a2b3-fb09a7986783'::uuid, 'd4ad7fc2-ccbd-4443-ab0c-5560486bc4f2'::uuid),
    ('4a82d45d-1a3e-482d-92b0-98a58e99705a'::uuid, 'b115c53a-6eda-4555-b83c-1f8e6e826aa3'::uuid, '4feefbb5-25b0-4ab5-b981-1e24f7e0d047'::uuid),
    ('d342abcd-dcae-4f2c-953b-1d348c92efbc'::uuid, '4e819376-85b1-4e69-85f5-e79df005aa79'::uuid, '46bdeb8f-968c-45ab-aa1a-ff23b4723f5b'::uuid),
    ('6b791d69-16a2-4eb5-916d-00a6640bbef0'::uuid, '09f0ac8b-9c52-4897-8db7-45a853548172'::uuid, 'd2140f6a-43f1-4407-8c76-b720cd808b08'::uuid),
    ('cb0874a3-5e5a-4284-ab76-56fede4b286f'::uuid, 'f3e9ce3f-b280-4dc1-b8cf-83750d8d17e2'::uuid, '83ba2f72-0d87-4253-8be2-18b723d93e89'::uuid),
    ('9e39b60b-da4d-4183-8302-364ca484e248'::uuid, '79e876e0-b52a-4d00-8684-6206544fb035'::uuid, '074201f2-a577-4981-b27e-665cd11917bc'::uuid),
    ('c9c5913a-f7f4-476c-82c6-f702292bcd85'::uuid, '8d64e2af-a58f-4a68-bb3c-9346ef520a24'::uuid, '95be0bea-27d4-4c3d-99cb-a499a80c337d'::uuid),
    ('0aa5ce7d-97bd-4c3c-ad17-304ce4a15ab1'::uuid, 'e3b8fd47-2212-4efc-9b99-d8fb6ffd4b3a'::uuid, 'a145a628-a3f4-46be-b8b3-7635f6ab3a76'::uuid),
    ('76f35702-4975-4e18-a0b4-6c518ee018b1'::uuid, 'f3364440-9036-4786-bd7d-00bf46bb4183'::uuid, '516e02be-72ae-4f57-a133-e59ec467a918'::uuid),
    ('8811d857-1e84-4882-aa72-62496914089a'::uuid, 'ace3e165-9e05-4363-8f81-0cf6959de1c1'::uuid, '3488b832-4f70-425e-98e3-ae26aa389914'::uuid),
    ('6dd8582e-ad55-4b09-a5cd-a3849c27e087'::uuid, 'd932b9c7-d3e6-406a-b639-4efa4c004822'::uuid, '8aad117e-af94-4ced-8044-79fc9af39df8'::uuid),
    ('4a5b25d5-17eb-4f91-ad59-c22eb83210d8'::uuid, 'c7387185-69b1-45b8-8871-5a421288db5f'::uuid, '4c0e2f0f-fd21-44ad-b35e-42d2bd4bd88b'::uuid),
    ('d10606a5-ce2b-4cda-a6a8-a2bac0f65bd5'::uuid, '19b0efcd-de1d-4feb-80df-b8b6a91ee068'::uuid, 'fb3c774e-8199-41f3-baa1-33874b93b3b6'::uuid),
    ('4efeea00-09cc-4047-a2ed-ebdfd63c61cd'::uuid, '4af5fd1b-02fd-4142-aa1c-e4591e7e9b72'::uuid, '3e01093a-6d00-4158-afb3-843e42121881'::uuid),
    ('3428d5d1-c6f5-49e5-9e4c-75bfde624104'::uuid, 'f256ab68-063d-4c3e-bd6e-039783b3ca24'::uuid, '23ebf403-260d-4cbb-827b-416de3ebef36'::uuid),
    ('0a5669d2-ef9a-43f5-8c00-35fa599d4ab5'::uuid, '95f3ca58-c693-46c1-9450-e7f6c22855a0'::uuid, '4015f01a-3baa-4cae-b742-a5e7f27bd489'::uuid),
    ('48168399-63c1-4ab3-a5cb-563959478838'::uuid, 'afa51c2d-7d00-4e6b-b716-5cc3de72191e'::uuid, 'bd042b04-ff5c-4e42-b9cc-9541089f8373'::uuid),
    ('cb325e2a-52dc-48cb-8593-1cf3cdc392aa'::uuid, 'e526926d-39b6-4525-856a-05bd4718706b'::uuid, '1adc1fda-afde-46e5-95ee-8c088fec3bee'::uuid),
    ('8d6c997f-e64d-41e0-ae96-46e02e485096'::uuid, 'c0e7fe60-f8bb-49ce-9b2c-96f1f1a9c0e0'::uuid, 'a1b07878-c8b5-4d30-b522-e9cb0fc9b060'::uuid),
    ('8212c749-8aec-4668-b50d-e6e8e679bbe5'::uuid, '3f09be31-2609-4c4e-98c6-322f40004419'::uuid, 'eb7e468b-56bb-4660-a923-07e0573ff567'::uuid),
    ('d5f5308c-c68c-4d7c-a477-04dc420d9830'::uuid, '5fcc7497-b454-4604-a789-e6c091b7e788'::uuid, 'eb3bcf6a-00b8-4ad0-a193-d8c010cf709e'::uuid),
    ('2b9c96e4-a929-46f0-8037-b0f2f2780db6'::uuid, '17d26838-1952-4f48-891d-2c825690a45b'::uuid, '1f68805e-c10f-417f-8c0a-97c864837e69'::uuid),
    ('c1d85ea8-70c0-4559-b0e9-224e2190db54'::uuid, 'cbb159a2-bec1-4b94-b20d-b1175ec9595b'::uuid, '2376600e-ec0a-4e35-8788-9f9b8125c46f'::uuid),
    ('9497bcc5-d8b8-4d37-bab3-754db8cbc3cd'::uuid, '75aad657-ca3e-4456-a156-dc2cdc5343b6'::uuid, '5e6b638b-549a-4d50-b4d8-b0ddbafd0356'::uuid),
    ('89cb5dc5-a371-4b14-b83c-8b715abe5c4a'::uuid, 'cbebb954-eee7-4893-aa72-8c446d2913cb'::uuid, '77426be2-2db4-4b46-874e-da1c560cbc0a'::uuid),
    ('84c5717d-4b83-41b6-9878-7c598e0a867c'::uuid, '0ee63f20-d13f-46c7-9cf5-b59514bbc09b'::uuid, 'a0697f85-08b9-4487-9462-0b33c8574951'::uuid),
    ('ef3661cc-ec04-4c06-864d-2802cef9de6b'::uuid, '106149f6-ee85-40eb-b483-db34da188af0'::uuid, '0930abb9-947c-4050-be73-b0fd7b933ad1'::uuid)
),

-- Derived sets for document, work, user IDs
all_doc_ids  AS (SELECT document_id AS id FROM expected_mapping),
all_work_ids AS (SELECT work_id     AS id FROM expected_mapping),
all_user_ids AS (SELECT user_id     AS id FROM expected_mapping),

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: SOURCE ID UNIVERSE
--
-- WHY TWO PARTS?
--   Building the source ID set only from existing work_sources rows would make
--   "deleted parent" orphans undetectable: if work_sources row is gone, its ID
--   never appears in the set, so source_identifiers/source_locations rows still
--   referencing that missing ID would be silently skipped.
--
-- SOLUTION — union of two parts:
--   (a) h6_current_source_ids  — sources currently in the DB for our test works
--       Catches: sources that still exist (normal case before cleanup)
--   (b) h6_harness_tracked_ids — source IDs the harness observed and recorded
--       in pool.json (user 1's 6 sources — the only user that ran source_write)
--       Catches: any of those IDs that may have been subsequently deleted while
--       leaving orphan child rows behind
-- ─────────────────────────────────────────────────────────────────────────────

h6_harness_tracked_ids (id) AS (
  -- Source IDs explicitly returned by POST /api/works/[id]/sources during the
  -- Stage 1 run and recorded in scratch/h6-p4b-pool.json (user index 1 only).
  -- Other users had empty sourceIds because the stage ended before their
  -- source_write slots executed.
  VALUES
    ('a58e3266-6e07-469b-87ca-62b88d65600d'::uuid),
    ('df7d735a-eb2a-4d24-b933-4b5205596780'::uuid),
    ('5a46f1fd-dcd2-46ee-a25d-78fe788e0b71'::uuid),
    ('c235d459-edef-4432-ac85-3566652eee00'::uuid),
    ('5a95c01b-b18b-45dc-823e-f65c2aca3b86'::uuid),
    ('5a50ea68-5155-4f32-81ac-85e6c12e814e'::uuid)
),

h6_current_source_ids AS (
  -- All work_sources currently in the DB that belong to our 75 test works.
  -- Includes sources created during the harness run that were not tracked in
  -- pool.json (e.g., sources from a failed source_write that still persisted).
  SELECT ws.id
  FROM work_sources ws
  WHERE ws.work_id IN (SELECT id FROM all_work_ids)
),

h6_all_source_ids AS (
  SELECT id FROM h6_current_source_ids
  UNION
  SELECT id FROM h6_harness_tracked_ids
),

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: CHECKS
-- Each check CTE returns rows with shape: check_name, entity_id, details.
-- A check CTE returning 0 rows means that check passed.
-- ─────────────────────────────────────────────────────────────────────────────

-- CHECK 1: Cross-user document ownership
-- Detects: a document owned by the wrong user, or linked to the wrong work.
check_1 AS (
  SELECT
    'CHECK_1_CROSS_USER_VIOLATION'                                    AS check_name,
    d.id::text                                                        AS entity_id,
    format(
      'document_id=%s expected_owner=%s actual_owner=%s expected_work=%s actual_work=%s',
      d.id, e.user_id, d.user_id, e.work_id, d.work_id
    )                                                                 AS details
  FROM expected_mapping e
  JOIN documents d ON d.id = e.document_id
  WHERE d.user_id <> e.user_id
     OR d.work_id IS DISTINCT FROM e.work_id
),

-- CHECK 2: Duplicate document_versions
-- Detects: two version rows with the same document_id + version_number.
check_2 AS (
  SELECT
    'CHECK_2_DUPLICATE_VERSIONS'                                      AS check_name,
    dv.document_id::text                                              AS entity_id,
    format(
      'document_id=%s version_number=%s count=%s',
      dv.document_id, dv.version_number, COUNT(*)
    )                                                                 AS details
  FROM document_versions dv
  WHERE dv.document_id IN (SELECT id FROM all_doc_ids)
  GROUP BY dv.document_id, dv.version_number
  HAVING COUNT(*) > 1
),

-- CHECK 3a: Duplicate work_sources by DOI (non-null DOIs only)
-- Detects: two sources in the same work with identical DOIs.
check_3a AS (
  SELECT
    'CHECK_3A_DUPLICATE_SOURCES_BY_DOI'                               AS check_name,
    ws.work_id::text                                                  AS entity_id,
    format(
      'work_id=%s doi=%s count=%s',
      ws.work_id, ws.doi, COUNT(*)
    )                                                                 AS details
  FROM work_sources ws
  WHERE ws.work_id IN (SELECT id FROM all_work_ids)
    AND ws.doi IS NOT NULL
  GROUP BY ws.work_id, ws.doi
  HAVING COUNT(*) > 1
),

-- CHECK 3b: Duplicate work_sources by null-DOI fallback identity
-- Fallback identity for sources where doi IS NULL:
--   (work_id, lower(trim(title)), authors->0->>'family', publication_year)
-- Detects: two diagnostic sources in the same work with matching fallback keys.
check_3b AS (
  SELECT
    'CHECK_3B_DUPLICATE_SOURCES_BY_FALLBACK'                          AS check_name,
    ws.work_id::text                                                  AS entity_id,
    format(
      'work_id=%s title_norm=%s first_author=%s year=%s count=%s',
      ws.work_id,
      lower(trim(ws.title)),
      ws.authors->0->>'family',
      ws.publication_year,
      COUNT(*)
    )                                                                 AS details
  FROM work_sources ws
  WHERE ws.work_id IN (SELECT id FROM all_work_ids)
    AND ws.doi IS NULL
  GROUP BY
    ws.work_id,
    lower(trim(ws.title)),
    ws.authors->0->>'family',
    ws.publication_year
  HAVING COUNT(*) > 1
),

-- CHECK 4: Orphan source_identifiers
-- Detects: source_identifier rows whose parent work_source no longer exists,
-- where the source_id belongs to the H6 test dataset (current OR tracked).
--
-- Correct scoping: we check against h6_all_source_ids (the two-part union),
-- NOT against rows currently in work_sources. This means if a work_source was
-- deleted but left a dangling source_identifier, the source_id will still be
-- in h6_all_source_ids (via h6_harness_tracked_ids) and the orphan is found.
check_4 AS (
  SELECT
    'CHECK_4_ORPHAN_SOURCE_IDENTIFIERS'                               AS check_name,
    si.id::text                                                       AS entity_id,
    format(
      'source_identifier_id=%s source_id=%s identifier_type=%s value=%s',
      si.id, si.source_id, si.identifier_type, si.normalized_value
    )                                                                 AS details
  FROM source_identifiers si
  WHERE si.source_id IN (SELECT id FROM h6_all_source_ids)
    AND NOT EXISTS (
      SELECT 1 FROM work_sources ws WHERE ws.id = si.source_id
    )
),

-- CHECK 5: Orphan source_locations
-- Same logic as CHECK 4 applied to source_locations.
check_5 AS (
  SELECT
    'CHECK_5_ORPHAN_SOURCE_LOCATIONS'                                 AS check_name,
    sl.id::text                                                       AS entity_id,
    format(
      'source_location_id=%s source_id=%s location_type=%s url=%s',
      sl.id, sl.source_id, sl.location_type, sl.url
    )                                                                 AS details
  FROM source_locations sl
  WHERE sl.source_id IN (SELECT id FROM h6_all_source_ids)
    AND NOT EXISTS (
      SELECT 1 FROM work_sources ws WHERE ws.id = sl.source_id
    )
),

-- CHECK 6: Version corruption
-- Detects: documents that received save operations but still have
-- editor_version < 1, indicating the version counter did not advance.
check_6 AS (
  SELECT
    'CHECK_6_VERSION_CORRUPTION'                                      AS check_name,
    d.id::text                                                        AS entity_id,
    format(
      'document_id=%s editor_version=%s user_id=%s',
      d.id, d.editor_version, d.user_id
    )                                                                 AS details
  FROM documents d
  WHERE d.id IN (SELECT id FROM all_doc_ids)
    AND d.editor_version < 1
),

-- CHECK 7: Orphan claim_source_evidence
-- Detects: claim_source_evidence rows whose source_id is a known H6 source
-- but whose parent work_source no longer exists.
check_7 AS (
  SELECT
    'CHECK_7_ORPHAN_CLAIM_SOURCE_EVIDENCE'                            AS check_name,
    cse.id::text                                                      AS entity_id,
    format(
      'evidence_id=%s claim_id=%s source_id=%s',
      cse.id, cse.claim_id, cse.source_id
    )                                                                 AS details
  FROM claim_source_evidence cse
  WHERE cse.source_id IN (SELECT id FROM h6_all_source_ids)
    AND NOT EXISTS (
      SELECT 1 FROM work_sources ws WHERE ws.id = cse.source_id
    )
)

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: COMBINED RESULT
-- All check CTEs unioned into a single result set.
-- 0 rows = all checks passed.  Any row = violation.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT check_name, entity_id, details FROM check_1
UNION ALL
SELECT check_name, entity_id, details FROM check_2
UNION ALL
SELECT check_name, entity_id, details FROM check_3a
UNION ALL
SELECT check_name, entity_id, details FROM check_3b
UNION ALL
SELECT check_name, entity_id, details FROM check_4
UNION ALL
SELECT check_name, entity_id, details FROM check_5
UNION ALL
SELECT check_name, entity_id, details FROM check_6
UNION ALL
SELECT check_name, entity_id, details FROM check_7
ORDER BY check_name, entity_id;
