# MedicationRequest → drug_exposure — review

Полный анализ Medication-кластера: **[Medication_cluster_review.md](Medication_cluster_review.md)**.

## Краткое summary специфично для MedicationRequest

- **status: implemented, primary, required**
- staging.medicationrequest_drug_exposure: **5469 rows**
- cdm_ours_fhir.drug_exposure (type=38000177): **4592 rows** (877 dropped в Maps-to)
- cdm.drug_exposure (ref, also type=38000177): **5472 rows**
- Diff: intersect 4552, only_ours 2, only_ref 849

### Особо для MedRequest

- `drug_type_concept_id = 38000177` "Prescription written" — **correct** ✅
- `start_date = end_date = authored_on` (нет dispense info)
- `requester_ref → provider_id` — единственный med-edge с provider_id

### Главные spec-impl gaps

1. `days_supply` обещано (из `dispenseRequest.expectedSupplyDuration`), реализовано NULL.
2. `refills` обещано (из `dispenseRequest.numberOfRepeatsAllowed`), реализовано NULL.
3. `sig` обещано (из `dosageInstruction.text`), реализовано NULL.
4. `route_concept_id` обещано (из `dosageInstruction.route`), реализовано NULL.

См. cluster review §4.5.
