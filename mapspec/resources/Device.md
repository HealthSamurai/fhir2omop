# Device Resources → OMOP Mapping

FHIR `Device` and `DeviceUseStatement` together describe a patient's exposure to a medical device. `Device` carries the device identity (type, UDI, manufacturer, lot/serial), while `DeviceUseStatement` records the clinical event (who, when, why). Additionally, `Procedure.usedCode` can reference devices used during a procedure. All three sources map to a single OMOP table: `device_exposure`.

OMOP's `device_exposure` table captures exposure to a foreign physical object or instrument used for diagnostic or therapeutic purposes through a mechanism beyond chemical action. This includes implantable objects (pacemakers, stents, artificial joints), medical equipment and supplies (bandages, crutches, syringes), instruments used in medical procedures (sutures, defibrillators), and material used in clinical care (adhesives, surgical material).

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `device_exposure` | One row per device usage event | Yes |

## Mapping Strategy

The Device/DeviceUseStatement mapping is less standardized across implementations than Patient or Condition. The fundamental challenge is that FHIR splits device information across two resources (Device for identity, DeviceUseStatement for the usage event), while OMOP flattens everything into a single `device_exposure` row. Key issues:

1. **Two-resource join.** `DeviceUseStatement.device` references a `Device` resource. The mapper must resolve this reference to extract `Device.type` (for `device_concept_id`), `Device.udiCarrier` (for `unique_device_id`), and `Device.lotNumber`/`Device.serialNumber` (for `production_id`). If the Device is contained within the DeviceUseStatement, the reference is local (`#id`); if external, the mapper must fetch or pre-cache the Device resource. omoponfhir handles this by embedding Device as a contained resource inside DeviceUseStatement.

2. **Alternative source: Procedure.usedCode.** ETL-German does not map DeviceUseStatement at all. Instead, it extracts device codes from `Procedure.usedCode` (a CodeableConcept list on the Procedure resource) and writes them directly to `device_exposure`. This avoids the two-resource join but loses UDI and device-specific metadata.

3. **Device concept vocabulary.** FHIR `Device.type` is typically coded in SNOMED CT (device hierarchy) or GMDN (Global Medical Device Nomenclature). OMOP expects `device_concept_id` to be a Standard Concept in the Device domain. SNOMED device codes map well via the OMOP vocabulary; GMDN requires custom source-to-concept mappings. If no standard concept is found, `device_concept_id = 0` and the source code goes to `device_source_value`.

4. **UDI parsing.** The FDA Unique Device Identification system has two parts: UDI-DI (Device Identifier, a fixed code for the device model) and UDI-PI (Production Identifier, variable per unit -- lot, serial, expiry, manufacturing date). FHIR separates these: `Device.udiCarrier[].deviceIdentifier` is UDI-DI, while lot/serial/expiry/manufacture date are top-level Device fields. OMOP v5.4 has `unique_device_id` (for UDI-DI) and `production_id` (for UDI-PI). Most implementations only populate `unique_device_id` from `deviceIdentifier`.

5. **Timing polymorphism.** `DeviceUseStatement.timing[x]` can be `dateTime`, `Period`, or `Timing`. omoponfhir reads only `timingPeriod`. A `dateTime` value should map to `device_exposure_start_date` with no end date. `Timing` (repeating schedule) has no natural OMOP representation -- flatten to the overall period or skip.

6. **Type concept provenance.** `device_type_concept_id` indicates how the record was sourced. omoponfhir hardcodes `44818707` ("EHR order list entry"). ETL-German uses `CONCEPT_EHR` (32817, "EHR"). The HL7 IG has no guidance. Use `32817` (EHR) for EHR-sourced data.

7. **No dedicated FHIR-to-OMOP device mapper in most implementations.** FhirToCdm (C#), NACHC, omopfhirmap, mends-on-fhir, and fhir-to-omop-demo have no device mapping at all. Only omoponfhir (bidirectional) and ETL-German (via Procedure.usedCode) implement device_exposure writes.

## Reference Implementations

- **fhir-omop-ig** (HL7) -- Logical model only at `refs/refs/fhir-omop-ig/input/fsh/DeviceExposure.fsh`; no FML transform map exists for DeviceExposure. Status: draft.
- **omoponfhir-v54-r4** (Georgia Tech, Java, R4) -- Bidirectional. `OmopDeviceUseStatement.java` (367 lines) handles F->O and O->F. Maps DeviceUseStatement + contained Device to device_exposure. `OmopDevice.java` (270 lines) handles O->F read-only (Device view of device_exposure). Status: maintained.
- **omoponfhir-omopv5-r4-mapping** (Georgia Tech, Java, R4) -- Earlier version, identical logic to v54. `OmopDeviceUseStatement.java` (367 lines). Status: stale.
- **ETL-German-FHIR-Core** (OHDSI, Java) -- Maps `Procedure.usedCode` to device_exposure via `ProcedureMapper.java` `createDeviceExposure()` (lines 218-265). No DeviceUseStatement mapper. Uses SNOMED concept lookup. Status: maintained.
- **FhirToCdm** (OHDSI, C#) -- No device mapping. `DeviceExposureRaw` list exists in `CdmPersonBuilder.cs` but `FhirToCdmMappings.cs` has no `CreateDeviceExposure` method. Status: incomplete.
- **GT-FHIR** (Georgia Tech, Java, DSTU2) -- Legacy. `DeviceExposure.java` entity maps to FHIR Device (not DeviceUseStatement). Read-only O->F. Status: dead.
- **HealthcareLakeETL** (PySpark) -- `mappings/device_exposure.py`. Maps FHIR Procedure (not Device/DeviceUseStatement) to device_exposure. Minimal field coverage. Status: abandoned.
- **NACHC-fhir-to-omop** (Java) -- Has `DeviceExposureDvo.java` data object but no FHIR mapping code. Status: no device mapping.
- **omopfhirmap** -- No device mapper.
- **mends-on-fhir** -- No device mapper.
- **fhir-to-omop-demo** -- No device mapper.
